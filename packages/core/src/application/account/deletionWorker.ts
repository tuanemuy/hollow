import {
  ACCOUNT_DELETION_LEASE_MS,
  type CredentialUseBinding,
} from "@repo/core/domain/account/deletion";
import type { HollowContainer } from "../di/hollowTypes";
import { hasDriveRetirement } from "../integration/drive/ports";
import { beginAccountNotePurge } from "../note/purge";
import type {
  AuthenticationExecution,
  CredentialClosedProof,
  OwnedCredentialExecution,
} from "./ports";
import { ownsCredentials } from "./ports";

async function saveDriveAcknowledgments(c: HollowContainer) {
  const execution = c.drive?.execution;
  if (!execution || !hasDriveRetirement(execution)) return;
  await execution.coordinate("maintenance", async () => {
    const initial = execution.acknowledgedReceipts(25);
    const drain = async (receipts: typeof initial) => {
      for (const receipt of receipts) {
        if (!execution.verifyAcknowledgedReceipt(receipt)) continue;
        const { proof } = receipt;
        if (proof.target.kind === "source") continue;
        const value = {
          kind: proof.target.kind,
          id: proof.target.id,
          runtimeGeneration: proof.target.owner.runtimeGeneration,
          ownerToken: proof.target.owner.token,
          evidenceId: proof.evidenceId,
        };
        const saved = await c.unitOfWorkProvider.run((u) =>
          u.accountDeletions.saveDriveAcknowledgment(value),
        );
        if (
          saved &&
          execution.verifyAcknowledgedReceipt(receipt) &&
          (await c.unitOfWorkProvider.run((u) =>
            u.accountDeletions.driveAcknowledgment(value),
          ))
        )
          execution.consumeAcknowledgedReceipt(receipt);
      }
    };
    await drain(initial);
    if (initial.length === 25) return;
    const pending = await c.unitOfWorkProvider.run((u) =>
      u.accountDeletions.pendingDriveAcknowledgments(
        execution.predecessors().map((p) => p.runtimeGeneration),
      ),
    );
    for (const target of pending.slice(0, 25 - initial.length)) {
      const closure = execution.closure({
        kind: target.kind,
        id: target.id,
        owner: {
          runtimeGeneration: target.runtimeGeneration,
          token: target.ownerToken,
        },
      });
      if (
        closure.kind === "closed" &&
        closure.proof.source === "predecessor-exit"
      )
        await execution.acknowledge(closure.proof);
    }
    await drain(
      execution
        .acknowledgedReceipts(25 - initial.length)
        .filter((receipt) => !initial.includes(receipt)),
    );
  });
}

async function saveCredentialProof(
  c: HollowContainer,
  execution: OwnedCredentialExecution,
  proof: CredentialClosedProof,
) {
  if (await execution.cancelUnclaimed(proof)) return;
  const closed = await c.unitOfWorkProvider.run(async (u) => {
    const saved = await u.accountDeletions.credentialUse(proof.target.id);
    if (!saved || !execution.verify(proof, saved)) return null;
    await u.accountDeletions.saveCredentialOrigin(proof.target);
    if (
      !(await u.accountDeletions.saveCredentialClosure(
        proof.target,
        proof.evidenceId,
        saved.version,
      ))
    )
      return null;
    const current = await u.accountDeletions.credentialUse(proof.target.id);
    return current &&
      execution.verify(proof, current) &&
      current.state === "closed"
      ? current
      : null;
  });
  if (!closed) return;
  const acknowledged = await c.unitOfWorkProvider.run(async (u) => {
    const saved = await u.accountDeletions.credentialUse(proof.target.id);
    if (!saved || saved.state !== "closed" || !execution.verify(proof, saved))
      return false;
    if (
      !(await u.accountDeletions.acknowledgeCredentialUse(
        proof.target,
        proof.evidenceId,
        saved.version,
      ))
    )
      return false;
    const current = await u.accountDeletions.credentialUse(proof.target.id);
    return (
      current?.state === "closed" &&
      current.acknowledged &&
      execution.verify(proof, current)
    );
  });
  if (acknowledged) await execution.acknowledge(proof);
}

export async function withCredentialUse<T>(
  c: HollowContainer,
  execution: AuthenticationExecution,
  provider: object,
  binding: CredentialUseBinding,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (!ownsCredentials(execution)) return execution.run(work);
  if (!execution.supportsProvider(provider))
    throw new Error("Invalid native credential provider binding");
  const target = execution.target(
    c.idGenerator.next(),
    binding,
    c.tokens.generate(),
  );
  try {
    return await execution.runOwned(target, async (signal) => {
      const result = await work(signal);
      await c.unitOfWorkProvider.run((u) =>
        u.accountDeletions.saveCredentialOrigin(target),
      );
      return result;
    });
  } finally {
    const proof = execution.closure(target);
    if (proof) await saveCredentialProof(c, execution, proof);
    else
      await c.unitOfWorkProvider.run(async (u) => {
        const saved = await u.accountDeletions.credentialUse(target.id);
        if (saved)
          await u.accountDeletions.markCredentialUnknown(target, saved.version);
      });
  }
}

async function recoverCredentialUses(c: HollowContainer) {
  for (const execution of [
    c.googleAuthentication?.execution,
    c.openRouter?.execution,
  ]) {
    if (!execution || !ownsCredentials(execution)) continue;
    for (const proof of execution.unacknowledged().slice(0, 25))
      await saveCredentialProof(c, execution, proof);
    const page = await c.unitOfWorkProvider.run((u) =>
      u.accountDeletions.pendingCredentialUses(
        execution.provider,
        null,
        execution.recoverableRuntimeIds(),
      ),
    );
    for (const saved of page) {
      const proof =
        execution.closure(saved.target) ?? execution.predecessor(saved);
      if (proof) await saveCredentialProof(c, execution, proof);
    }
    const remaining = await c.unitOfWorkProvider.run((u) =>
      u.accountDeletions.credentialRuntimeIds(
        execution.provider,
        execution.recoverableRuntimeIds(),
      ),
    );
    await execution.acknowledgePredecessors(remaining);
  }
}

export async function sweepAccountDeletions(c: HollowContainer): Promise<void> {
  await saveDriveAcknowledgments(c);
  await recoverCredentialUses(c);
  const now = c.clock.now();
  const token = c.tokens.generate();
  const intent = await c.unitOfWorkProvider.run((u) =>
    u.accountDeletions.claim(
      now,
      token,
      new Date(now.getTime() + ACCOUNT_DELETION_LEASE_MS),
    ),
  );
  if (!intent) return;
  try {
    const storage = c.importing?.storage;
    const remove = storage?.removeClaimed;
    if (storage && remove) {
      const resources = await c.unitOfWorkProvider.run((u) =>
        u.accountDeletions.resources(intent, c.clock.now()),
      );
      for (const resource of resources) {
        if (
          !(await c.unitOfWorkProvider.run((u) =>
            u.accountDeletions.resourceReady(intent, resource, c.clock.now()),
          ))
        )
          continue;
        const deleted: { key: string; token: string }[] = [];
        for (const key of resource.keys)
          deleted.push({ key, ...(await remove.call(storage, key)) });
        await c.unitOfWorkProvider.run((u) =>
          u.accountDeletions.completeResource(
            intent,
            resource,
            deleted,
            c.clock.now(),
          ),
        );
      }
    }
    await c.unitOfWorkProvider.run(async (u) => {
      if (intent.cursor.table === "personal-notes") {
        const notes = await u.accountDeletions.personalNotes(
          intent,
          c.clock.now(),
        );
        for (const noteId of notes)
          await beginAccountNotePurge(c, u, intent.id, noteId);
      }
      await u.accountDeletions.step(intent, c.clock.now());
    });
  } catch {
    await c.unitOfWorkProvider.run((u) =>
      u.accountDeletions.release(
        intent.id,
        token,
        c.clock.now(),
        "step-failed",
      ),
    );
    c.logger.error("Account deletion step failed", { code: "step-failed" });
  }
}
