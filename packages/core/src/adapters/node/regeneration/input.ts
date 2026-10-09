import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { isSystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { currentLlmSource } from "@repo/core/application/llm/current";
import {
  candidateOutcome,
  captureDriveLlmPrewrite,
  captureDriveLlmTerminal,
  driveLlmTerminalSaved,
  leasedDrive,
  leasedLocal,
  leasedText,
  queuedCancellationFence,
  sameDrivePrewrite,
  sameInputReceipt,
  sameInputSource,
  terminateCandidate,
} from "@repo/core/application/llm/inputStage";
import {
  type DriveLlmPrewrite,
  type DriveLlmRecorder,
  type DriveLlmTerminalCall,
  isLlmOperationError,
  type LlmImageRaster,
  type LlmInputClaim,
  type LlmLocalRuntimeOwnership,
  LlmOperationError,
  type LlmPreparedSource,
} from "@repo/core/application/llm/ports";
import {
  currentInput,
  inputConsumer,
} from "@repo/core/application/regeneration/current";
import {
  beginInput,
  finishInput,
} from "@repo/core/application/regeneration/memory";
import type {
  ActiveInputReceipt,
  RegenerationServices,
  SourceInputAdmission,
  SourceInputLease,
  SourceInputProof,
} from "@repo/core/application/regeneration/services";
import { sourceStateInvalid } from "@repo/core/application/regeneration/services";
import { readInput } from "@repo/core/application/regeneration/source";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
import type {
  PdfChoice,
  PdfPageIdentity,
  PdfPageManifest,
  PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import { attemptReleased } from "@repo/core/domain/regeneration/entity";
import type { RegenerationConsumer } from "@repo/core/domain/regeneration/source";
import { NodeRegenerationMemory } from "./memory";

type DriveAttempt = {
  before: DriveLlmPrewrite | null;
  call: DriveLlmTerminalCall | null;
  wrote: boolean;
  recording: boolean;
};
type DriveTerminal = {
  readonly work: (
    u: HollowUnitOfWorkContext,
    recorder: DriveLlmRecorder,
  ) => Promise<void>;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
  attempt: DriveAttempt | null;
  active: boolean;
  invocations: number;
};
type DrivePending = {
  readonly value: LlmConversion;
  readonly lease: SourceInputLease;
  readonly closed: Promise<LlmConversion>;
  readonly resolveClosed: (value: LlmConversion) => void;
  readonly rejectClosed: (error: unknown) => void;
  phase: "checking" | "saving" | "closed" | "unknown";
  saved: LlmConversion | null;
  proof: SourceInputProof | null;
  failure: { error: unknown } | null;
  closingActive: boolean;
  terminal: DriveTerminal | null;
};

export class NodeRegenerationInput {
  private readonly proofs = new WeakMap<SourceInputLease, SourceInputProof>();
  private readonly leases = new Map<string, SourceInputLease>();
  private readonly leaseSources = new Map<string, LlmConversion>();
  private readonly pending = new Map<
    string,
    {
      candidate: LlmConversion;
      admission: SourceInputAdmission;
      receipt: ActiveInputReceipt;
      fenced?: LlmConversion | undefined;
      recoverable: boolean;
    }
  >();
  private readonly previewLeases = new Map<string, SourceInputLease>();
  private readonly previewSources = new Map<string, PdfPreview>();
  private readonly pendingPreviews = new Map<
    string,
    {
      candidate: PdfPreview;
      admission: SourceInputAdmission;
      receipt: ActiveInputReceipt;
      recoverable: boolean;
    }
  >();
  private readonly retained = new Map<
    SourceInputLease,
    LlmPreparedSource | PdfChoice | LlmImageRaster
  >();
  private localOwnership: LlmLocalRuntimeOwnership | undefined;
  private stopped = false;
  private readonly drivePending = new Map<string, DrivePending>();
  constructor(
    private readonly container: HollowContainer,
    private readonly services: RegenerationServices,
  ) {}
  private memory() {
    if (!(this.services.input instanceof NodeRegenerationMemory))
      return sourceStateInvalid();
    return this.services.input;
  }
  lease(value: LlmConversion) {
    const lease = this.leases.get(value.jobId);
    const source = this.leaseSources.get(value.jobId);
    return lease &&
      source &&
      sameInputSource(source, value) &&
      this.services.input.owns(lease) &&
      sameInputReceipt(lease.receipt, value.inputReceipt)
      ? lease
      : null;
  }
  async claim(): Promise<LlmInputClaim | null> {
    if (this.stopped) return null;
    const candidate = await this.container.unitOfWorkProvider.run((u) =>
      u.llmConversions.claimCandidate(this.container.clock.now()),
    );
    if (!candidate) return null;
    if (leasedDrive(candidate) && !this.services.provider)
      return sourceStateInvalid();
    const terminated = await this.container.unitOfWorkProvider.run(
      async (u) => {
        const current = await u.llmConversions.find(candidate.jobId);
        if (!current || current.version !== candidate.version) return false;
        return terminateCandidate(this.container, u, current);
      },
    );
    if (terminated) return null;
    const runtimeId = this.runtimeId;
    const ownerToken = this.container.idGenerator.next();
    if (
      !(
        (leasedDrive(candidate) && this.services.provider) ||
        (this.localOwnership ? leasedLocal(candidate) : leasedText(candidate))
      )
    ) {
      const value = await this.container.unitOfWorkProvider.run(async (u) => {
        const current = await u.llmConversions.find(candidate.jobId);
        if (
          !current ||
          current.version !== candidate.version ||
          (await terminateCandidate(this.container, u, current))
        )
          return null;
        return u.llmConversions.claimExact({
          candidate,
          runtimeId,
          ownerToken,
          receipt: null,
          now: this.container.clock.now(),
        });
      });
      return value ? { value, lease: null } : null;
    }
    const memory = this.memory();
    const reserved = memory.tryReserveBegin({
      kind: "llm-conversion",
      id: candidate.jobId,
    });
    if (reserved.kind === "busy") return null;
    const receipt: ActiveInputReceipt = {
      consumer: reserved.admission.consumer,
      runtimeId,
      token: ownerToken,
      generation: (candidate.inputReceipt?.generation ?? 0) + 1,
      state: "active",
    };
    try {
      memory.bindBegin(reserved.admission, receipt);
    } catch (error) {
      memory.holdBegin(reserved.admission);
      throw error;
    }
    const intent: {
      candidate: LlmConversion;
      admission: SourceInputAdmission;
      receipt: ActiveInputReceipt;
      fenced?: LlmConversion | undefined;
      recoverable: boolean;
    } = {
      candidate,
      admission: reserved.admission,
      receipt,
      recoverable: true,
    };
    this.pending.set(candidate.jobId, intent);
    try {
      const committed = await memory.claimTransaction(
        intent.admission,
        this.container.unitOfWorkProvider,
        async (u) => {
          const current = await u.llmConversions.find(candidate.jobId);
          if (!current || current.version !== candidate.version)
            return { kind: "no-claim" };
          if (await terminateCandidate(this.container, u, current)) {
            intent.fenced =
              (await u.llmConversions.find(current.jobId)) ?? undefined;
            return { kind: "fenced" };
          }
          const value = await u.llmConversions.claimExact({
            candidate,
            runtimeId,
            ownerToken,
            receipt,
            now: this.container.clock.now(),
          });
          return value ? { kind: "claimed", value } : { kind: "no-claim" };
        },
      );
      this.pending.delete(candidate.jobId);
      if (committed.result.kind !== "claimed" || !committed.lease) return null;
      this.leases.set(candidate.jobId, committed.lease);
      this.leaseSources.set(candidate.jobId, committed.result.value);
      return { value: committed.result.value, lease: committed.lease };
    } catch (error) {
      if (
        !isSystemError(error) ||
        error.code !== SystemErrorCode.DatabaseError
      ) {
        intent.recoverable = false;
        throw error;
      }
      return null;
    }
  }
  private runtimeIdValue: string | null = null;
  configureRuntime(runtimeId: string, ownership?: LlmLocalRuntimeOwnership) {
    if (this.runtimeIdValue !== null) return sourceStateInvalid();
    this.runtimeIdValue = runtimeId;
    this.localOwnership = ownership;
  }
  private get runtimeId() {
    if (this.runtimeIdValue === null) return sourceStateInvalid();
    return this.runtimeIdValue;
  }
  async resume(): Promise<readonly LlmInputClaim[]> {
    const resumed: LlmInputClaim[] = [];
    for (const intent of this.pending.values()) {
      if (!intent.recoverable) continue;
      try {
        const committed = await this.memory().claimTransaction(
          intent.admission,
          this.container.unitOfWorkProvider,
          async (u) => {
            const current = await u.llmConversions.find(intent.candidate.jobId);
            if (!current || !sameInputSource(current, intent.candidate))
              return { kind: "no-claim" };
            if (
              queuedCancellationFence(intent.candidate, current) &&
              (await u.llmQuota.reservation(current.jobId))?.state ===
                "released" &&
              (await u.llmDispatches.list(current.jobId)).length === 0
            )
              return { kind: "cancelled-fence" };
            if (
              intent.fenced &&
              JSON.stringify(current) === JSON.stringify(intent.fenced) &&
              current.version > intent.candidate.version
            )
              return { kind: "fenced" };
            if (
              sameInputReceipt(current.inputReceipt, intent.receipt) &&
              current.sourceMemoryBytes === 52_428_800 &&
              current.owner.state === "active" &&
              current.owner.runtimeId === intent.receipt.runtimeId &&
              current.owner.token === intent.receipt.token
            )
              return { kind: "claimed", value: current };
            if (
              current.sourceMemoryBytes !== 0 ||
              !sameInputReceipt(
                current.inputReceipt,
                intent.candidate.inputReceipt,
              )
            )
              return { kind: "no-claim" };
            const outcome = await candidateOutcome(this.container, u, current);
            if (outcome) {
              if (await terminateCandidate(this.container, u, current)) {
                intent.fenced =
                  (await u.llmConversions.find(current.jobId)) ?? undefined;
                return { kind: "fenced" };
              }
              return { kind: "no-claim" };
            }
            if (current.version !== intent.candidate.version)
              return { kind: "no-claim" };
            const value = await u.llmConversions.claimExact({
              candidate: intent.candidate,
              runtimeId: intent.receipt.runtimeId,
              ownerToken: intent.receipt.token,
              receipt: intent.receipt,
              now: this.container.clock.now(),
            });
            return value ? { kind: "claimed", value } : { kind: "no-claim" };
          },
        );
        if (committed.result.kind === "no-claim") continue;
        this.pending.delete(intent.candidate.jobId);
        if (committed.result.kind === "claimed" && committed.lease) {
          this.leases.set(intent.candidate.jobId, committed.lease);
          this.leaseSources.set(intent.candidate.jobId, committed.result.value);
          resumed.push({
            value: committed.result.value,
            lease: committed.lease,
          });
        }
      } catch (error) {
        if (
          !isSystemError(error) ||
          error.code !== SystemErrorCode.DatabaseError
        ) {
          intent.recoverable = false;
          throw error;
        }
      }
    }
    return resumed;
  }
  async prepare(
    initial: LlmConversion,
    signal: AbortSignal,
  ): Promise<LlmPreparedSource> {
    let value = initial;
    if (value.selection !== "fixed") return sourceStateInvalid();
    let lease = this.lease(value);
    if (
      !lease &&
      this.localOwnership &&
      value.sourceMemoryBytes === 0 &&
      value.inputReceipt?.state === "closed"
    ) {
      const begun = await this.beginLocal(value);
      value = begun.value;
      lease = begun.lease;
    }
    if (!lease) return sourceStateInvalid();
    try {
      await this.read(lease, signal);
      const checked = await this.container.unitOfWorkProvider.run((u) =>
        currentLlmSource(u, value, this.container.clock.now(), this),
      );
      if (signal.aborted)
        throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
      const media = checked.media.map(({ sourceUrl, placeholder }) => ({
        sourceUrl,
        placeholder,
      }));
      let prepared: LlmPreparedSource;
      if (!this.localOwnership) {
        if (value.preparationVersion !== 1) return sourceStateInvalid();
        prepared = await this.services.input.prepareText(
          lease,
          value.source,
          signal,
          media,
        );
      } else {
        switch (value.preparationVersion) {
          case 1:
            prepared = (
              await this.memory().prepareWork(
                lease,
                { kind: "prepare-v1", contract: value, media },
                signal,
              )
            ).prepared;
            break;
          case 2:
            prepared = (
              await this.memory().prepareWork(
                lease,
                { kind: "prepare-v2", contract: value },
                signal,
              )
            ).prepared;
            break;
          case 3:
            prepared = (
              await this.memory().prepareWork(
                lease,
                {
                  kind: "prepare-v3",
                  contract: value,
                  native: this.localOwnership.nativeOwner(value, lease),
                },
                signal,
              )
            ).prepared;
            break;
          case 4:
            prepared = (
              await this.memory().prepareWork(
                lease,
                {
                  kind: "prepare-v4",
                  contract: value,
                  native: this.localOwnership.nativeOwner(value, lease),
                },
                signal,
              )
            ).prepared;
            break;
          default:
            return sourceStateInvalid();
        }
      }
      this.retained.set(lease, prepared);
      if (!leasedDrive(value)) await this.finish(lease);
      return prepared;
    } catch (error) {
      if (leasedDrive(value)) {
        await this.closeDrive(value, undefined);
        throw error;
      }
      await this.failedWork(lease);
      if (isLlmOperationError(error)) throw error;
      throw new LlmOperationError(
        "LLM_SOURCE_CHANGED",
        "not-sent",
        !this.leases.has(value.jobId),
      );
    }
  }
  private async failedWork(lease: SourceInputLease) {
    if (this.services.input.owns(lease)) {
      this.services.input.discard(lease);
      await this.finish(lease);
    }
  }
  async claimPreview(): Promise<PdfPreview | null> {
    if (this.stopped || !this.localOwnership) return null;
    const candidate = await this.container.unitOfWorkProvider.run((u) =>
      u.llmPdfPreviews.claimCandidate(this.container.clock.now()),
    );
    if (!candidate || candidate.access.origin === "redacted") return null;
    if (candidate.access.origin === "drive-record" && !this.services.provider)
      return sourceStateInvalid();
    const reserved = this.memory().tryReserveBegin({
      kind: "pdf-preview",
      id: candidate.id,
    });
    if (reserved.kind === "busy") return null;
    const receipt: ActiveInputReceipt = {
      consumer: reserved.admission.consumer,
      runtimeId: this.runtimeId,
      token: this.container.idGenerator.next(),
      generation: (candidate.inputReceipt?.generation ?? 0) + 1,
      state: "active",
    };
    try {
      this.memory().bindBegin(reserved.admission, receipt);
    } catch (error) {
      this.memory().holdBegin(reserved.admission);
      throw error;
    }
    const intent = {
      candidate,
      receipt,
      admission: reserved.admission,
      recoverable: true,
    };
    this.pendingPreviews.set(candidate.id, intent);
    return this.settlePreview(intent);
  }
  private async settlePreview(intent: {
    candidate: PdfPreview;
    admission: SourceInputAdmission;
    receipt: ActiveInputReceipt;
    recoverable: boolean;
  }): Promise<PdfPreview | null> {
    try {
      const committed = await this.memory().claimTransaction<PdfPreview>(
        intent.admission,
        this.container.unitOfWorkProvider,
        async (u) => {
          const current = await u.llmPdfPreviews.find(intent.candidate.id);
          if (!current || !samePreviewSource(current, intent.candidate))
            return { kind: "no-claim" };
          if (queuedPreviewCancellationFence(intent.candidate, current))
            return { kind: "cancelled-fence" };
          if (
            current.state === "running" &&
            current.owner.state === "active" &&
            current.owner.runtimeId === intent.receipt.runtimeId &&
            current.owner.token === intent.receipt.token &&
            current.sourceMemoryBytes === 52_428_800 &&
            sameInputReceipt(current.inputReceipt, intent.receipt)
          ) {
            return { kind: "claimed", value: current };
          }
          if (
            current.version !== intent.candidate.version ||
            current.state !== "queued" ||
            current.sourceMemoryBytes !== 0 ||
            !sameInputReceipt(
              current.inputReceipt,
              intent.candidate.inputReceipt,
            )
          )
            return { kind: "no-claim" };
          const value = await u.llmPdfPreviews.claimExact({
            candidate: intent.candidate,
            receipt: intent.receipt,
            runtimeId: intent.receipt.runtimeId,
            ownerToken: intent.receipt.token,
            now: this.container.clock.now(),
          });
          return value ? { kind: "claimed", value } : { kind: "no-claim" };
        },
      );
      if (committed.result.kind === "no-claim" && !committed.lease) {
        if (!this.memory().hasPendingBegin(intent.admission))
          this.pendingPreviews.delete(intent.candidate.id);
        return null;
      }
      this.pendingPreviews.delete(intent.candidate.id);
      if (committed.result.kind !== "claimed" || !committed.lease) return null;
      this.previewLeases.set(intent.candidate.id, committed.lease);
      this.previewSources.set(intent.candidate.id, committed.result.value);
      return committed.result.value;
    } catch (error) {
      if (
        !isSystemError(error) ||
        error.code !== SystemErrorCode.DatabaseError
      ) {
        intent.recoverable = false;
        throw error;
      }
      return null;
    }
  }
  async resumePreview(): Promise<readonly PdfPreview[]> {
    const values: PdfPreview[] = [];
    for (const intent of this.pendingPreviews.values()) {
      if (!intent.recoverable) continue;
      const value = await this.settlePreview(intent);
      if (value) values.push(value);
    }
    return values;
  }
  previewLease(value: PdfPreview) {
    const lease = this.previewLeases.get(value.id);
    const source = this.previewSources.get(value.id);
    return lease &&
      source &&
      samePreviewSource(source, value) &&
      this.services.input.owns(lease) &&
      sameInputReceipt(lease.receipt, value.inputReceipt)
      ? lease
      : null;
  }
  async classify(
    value: LlmConversion | PdfPreview,
    signal: AbortSignal,
  ): Promise<PdfChoice> {
    if (!this.localOwnership || value.source.format !== "pdf")
      return sourceStateInvalid();
    const lease =
      "operation" in value ? this.lease(value) : this.previewLease(value);
    if (!lease) return sourceStateInvalid();
    try {
      await this.read(lease, signal);
      await this.container.unitOfWorkProvider.run((u) =>
        currentInput(this.container, u, lease.receipt.consumer),
      );
      const result = await this.memory().prepareWork(
        lease,
        {
          kind: "classify-pdf",
          source: { ...value.source, format: "pdf" },
          native: this.localOwnership.nativeOwner(value, lease),
        },
        signal,
      );
      this.retained.set(lease, result.choice);
      if (value.access.origin === "drive-record")
        await this.finalCheck(lease, signal);
      await this.finish(lease);
      return result.choice;
    } catch (error) {
      await this.failedWork(lease);
      if (isLlmOperationError(error)) throw error;
      const held =
        "operation" in value
          ? this.leases.has(value.jobId)
          : this.previewLeases.has(value.id);
      throw new LlmOperationError(
        held ? "LLM_OWNERSHIP_UNKNOWN" : "LLM_SOURCE_CHANGED",
        "not-sent",
        !held,
      );
    }
  }
  async redraw(
    value: LlmConversion,
    manifest: PdfPageManifest,
    page: PdfPageIdentity,
    signal: AbortSignal,
  ): Promise<LlmImageRaster> {
    if (
      !this.localOwnership ||
      value.selection !== "fixed" ||
      value.preparationVersion !== 4 ||
      JSON.stringify(value.manifest) !== JSON.stringify(manifest) ||
      !manifest.pages.some(
        (entry) => JSON.stringify(entry) === JSON.stringify(page),
      )
    )
      return sourceStateInvalid();
    const existing = leasedDrive(value) ? this.lease(value) : null;
    const begun = existing
      ? { lease: existing, value }
      : await this.beginLocal(value);
    const lease = begun.lease;
    const current = begun.value;
    try {
      await this.read(lease, signal);
      await this.container.unitOfWorkProvider.run((u) =>
        currentLlmSource(u, current, this.container.clock.now(), this),
      );
      const result = await this.memory().prepareWork(
        lease,
        {
          kind: "redraw-pdf",
          source: value.source,
          manifest,
          page,
          native: this.localOwnership.nativeOwner(current, lease, page),
        },
        signal,
      );
      this.retained.set(lease, result.raster);
      if (!leasedDrive(current)) await this.finish(lease);
      return result.raster;
    } catch (error) {
      if (leasedDrive(current)) {
        await this.closeDrive(current, undefined);
        if (
          error instanceof BusinessRuleError &&
          error.code === "REGENERATION_SOURCE_INVALID"
        )
          throw error;
      } else await this.failedWork(lease);
      if (isLlmOperationError(error)) throw error;
      const held = this.leases.has(value.jobId);
      throw new LlmOperationError(
        held ? "LLM_OWNERSHIP_UNKNOWN" : "LLM_SOURCE_CHANGED",
        "not-sent",
        !held,
      );
    }
  }
  private async beginLocal(value: LlmConversion) {
    const memory = this.memory();
    const admission = memory.reserveBegin({
      kind: "llm-conversion",
      id: value.jobId,
    });
    try {
      const current = await this.container.unitOfWorkProvider.run(async (u) => {
        const checked = await currentLlmSource(
          u,
          value,
          this.container.clock.now(),
        );
        const current = checked.current;
        if (
          !sameInputSource(current, value) ||
          !sameInputReceipt(current.inputReceipt, value.inputReceipt) ||
          current.owner.state !== "active" ||
          current.owner.runtimeId !== this.runtimeId ||
          current.sourceMemoryBytes !== 0 ||
          current.inputReceipt?.state !== "closed"
        )
          return sourceStateInvalid();
        const receipt: ActiveInputReceipt = {
          consumer: current.inputReceipt.consumer,
          runtimeId: current.inputReceipt.runtimeId,
          token: current.inputReceipt.token,
          generation: current.inputReceipt.generation + 1,
          state: "active",
        };
        memory.bindBegin(admission, receipt);
        if (
          !(await u.llmConversions.replace(
            {
              ...current,
              inputReceipt: receipt,
              sourceMemoryBytes: 52_428_800,
              version: current.version + 1,
              updatedAt: this.container.clock.now(),
            },
            current.version,
          ))
        )
          return sourceStateInvalid();
        const next = await u.llmConversions.find(current.jobId);
        if (!next || !sameInputReceipt(next.inputReceipt, receipt))
          return sourceStateInvalid();
        return next;
      });
      const lease = memory.commitBegin(admission);
      this.leases.set(value.jobId, lease);
      this.leaseSources.set(value.jobId, current);
      return { value: current, lease };
    } catch (error) {
      memory.holdBegin(admission);
      if (isLlmOperationError(error)) throw error;
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
    }
  }
  async finishPreview(value: PdfPreview) {
    const lease = this.previewLeases.get(value.id);
    if (!lease) return sourceStateInvalid();
    await this.finish(lease);
  }
  discard(value: LlmConversion) {
    const lease = this.lease(value);
    if (!lease) return sourceStateInvalid();
    this.services.input.discard(lease);
  }
  async stop() {
    this.stopped = true;
    await this.recoverDriveCompletions();
    await this.resume();
    await this.resumePreview();
    if (
      this.pending.size ||
      this.leases.size ||
      this.previewLeases.size ||
      this.pendingPreviews.size ||
      this.retained.size ||
      this.drivePending.size ||
      this.memory().activeInputs()
    )
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
  }
  begin(consumer: RegenerationConsumer) {
    return beginInput(this.container, this.services, consumer);
  }
  read(lease: SourceInputLease, signal: AbortSignal) {
    return readInput(this.container, this.services, lease, signal);
  }
  async prepareText(lease: SourceInputLease, signal: AbortSignal) {
    const input = await this.container.unitOfWorkProvider.run((u) =>
      currentInput(this.container, u, lease.receipt.consumer),
    );
    const format = input.source.format;
    if (format !== "text" && format !== "html" && format !== "markdown")
      return sourceStateInvalid();
    return this.services.input.prepareText(
      lease,
      {
        ...input.source,
        kind: "original",
        originalId: input.originalId,
        format,
      },
      signal,
    );
  }
  finalCheck(lease: SourceInputLease, signal: AbortSignal) {
    return readInput(
      this.container,
      this.services,
      lease,
      signal,
      "final-check",
    );
  }
  async finish(value: SourceInputLease | LlmConversion) {
    if (!("receipt" in value) && leasedDrive(value)) {
      await this.closeDrive(value, undefined);
      return;
    }
    const lease = "receipt" in value ? value : this.leases.get(value.jobId);
    if (!lease) return sourceStateInvalid();
    const proof =
      this.proofs.get(lease) ??
      this.services.input.finish(lease, this.container.idGenerator.next());
    this.proofs.set(lease, proof);
    try {
      await finishInput(this.container, this.services, proof);
    } catch (error) {
      if (!isSystemError(error) || error.code !== SystemErrorCode.DatabaseError)
        throw error;
      const saved = await this.container.unitOfWorkProvider.run((u) =>
        inputConsumer(u, proof.receipt.consumer, this.container.clock.now()),
      );
      if (
        saved.owner.state === "unknown" ||
        saved.memory !== 0 ||
        !saved.receipt ||
        !this.services.input.verify(proof, saved.receipt) ||
        !sameInputReceipt(saved.receipt, proof.receipt)
      )
        throw error;
      this.services.input.consume(proof);
    }
    if (lease.receipt.consumer.kind === "llm-conversion") {
      this.leases.delete(lease.receipt.consumer.id);
      this.leaseSources.delete(lease.receipt.consumer.id);
    } else if (lease.receipt.consumer.kind === "pdf-preview") {
      this.previewLeases.delete(lease.receipt.consumer.id);
      this.previewSources.delete(lease.receipt.consumer.id);
    }
    this.retained.delete(lease);
  }

  finalizeDrive(value: LlmConversion, signal: AbortSignal) {
    return this.closeDrive(value, signal);
  }
  private closeDrive(
    value: LlmConversion,
    signal: AbortSignal | undefined,
  ): Promise<LlmConversion> {
    const existing = this.drivePending.get(value.jobId);
    if (existing)
      return !signal && existing.phase === "closed" && existing.saved
        ? Promise.resolve(existing.saved)
        : existing.closed;
    const lease = this.lease(value);
    if (
      !leasedDrive(value) ||
      !this.services.provider ||
      !lease ||
      this.drivePending.size >= 2
    )
      return Promise.reject(
        new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false),
      );
    let resolveClosed!: (value: LlmConversion) => void;
    let rejectClosed!: (error: unknown) => void;
    const closed = new Promise<LlmConversion>((resolve, reject) => {
      resolveClosed = resolve;
      rejectClosed = reject;
    });
    void closed.catch(() => {});
    const entry: DrivePending = {
      value,
      lease,
      closed,
      resolveClosed,
      rejectClosed,
      phase: "checking",
      saved: null,
      proof: null,
      failure: null,
      closingActive: true,
      terminal: null,
    };
    this.drivePending.set(value.jobId, entry);
    void (async () => {
      if (signal) {
        try {
          await this.finalCheck(lease, signal);
        } catch (error) {
          if (isLlmOperationError(error) && !error.closed) {
            entry.phase = "unknown";
            entry.closingActive = false;
            entry.rejectClosed(
              new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false),
            );
            return;
          }
          entry.failure = { error };
        }
      }
      try {
        if ((!signal || entry.failure) && this.services.input.owns(lease))
          this.services.input.discard(lease);
        entry.proof =
          this.proofs.get(lease) ??
          this.services.input.finish(lease, this.container.idGenerator.next());
        this.proofs.set(lease, entry.proof);
        entry.phase = "saving";
        await this.saveDriveClosed(entry);
      } catch (error) {
        if (
          !isSystemError(error) ||
          error.code !== SystemErrorCode.DatabaseError
        ) {
          entry.phase = "unknown";
          entry.rejectClosed(
            new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false),
          );
        }
      } finally {
        entry.closingActive = false;
      }
    })();
    return closed;
  }
  private async saveDriveClosed(entry: DrivePending) {
    const proof = entry.proof;
    if (!proof || entry.phase !== "saving") return;
    if (!this.memory().consumed(proof, entry.lease))
      await finishInput(this.container, this.services, proof);
    const saved = await this.container.unitOfWorkProvider.run(async (u) => {
      const value = await u.llmConversions.find(entry.value.jobId);
      if (
        !value ||
        value.access.origin !== "drive-record" ||
        !sameInputSource(value, entry.value) ||
        value.owner.state === "unknown" ||
        value.owner.runtimeId !== entry.value.owner.runtimeId ||
        value.owner.token !== entry.value.owner.token ||
        value.sourceMemoryBytes !== 0 ||
        !sameInputReceipt(value.inputReceipt, proof.receipt) ||
        !(
          await u.regenerationAttempts.forBinding(value.access.bindingId)
        ).every(attemptReleased)
      )
        return sourceStateInvalid();
      return value;
    });
    if (!this.memory().consumed(proof, entry.lease))
      return sourceStateInvalid();
    entry.phase = "closed";
    entry.saved = saved;
    if (entry.failure !== null) entry.rejectClosed(entry.failure.error);
    else entry.resolveClosed(saved);
  }
  commitDrive(
    value: LlmConversion,
    work: DriveTerminal["work"],
  ): Promise<void> {
    const entry = this.drivePending.get(value.jobId);
    if (
      !entry ||
      entry.phase !== "closed" ||
      !entry.proof ||
      entry.terminal ||
      !this.memory().consumed(entry.proof, entry.lease) ||
      !sameInputSource(value, entry.value) ||
      !sameInputReceipt(value.inputReceipt, entry.proof.receipt)
    )
      return Promise.reject(
        new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false),
      );
    const promise = new Promise<void>((resolve, reject) => {
      entry.terminal = {
        work,
        resolve,
        reject,
        attempt: null,
        active: false,
        invocations: 0,
      };
    });
    void this.runDriveTerminal(entry).catch(() => {
      entry.phase = "unknown";
    });
    return promise;
  }
  private async runDriveTerminal(entry: DrivePending) {
    const terminal = entry.terminal;
    if (
      !terminal ||
      terminal.active ||
      terminal.attempt ||
      terminal.invocations >= 2
    )
      return;
    terminal.active = true;
    terminal.invocations++;
    const attempt: DriveAttempt = {
      before: null,
      call: null,
      wrote: false,
      recording: false,
    };
    terminal.attempt = attempt;
    try {
      await this.container.unitOfWorkProvider.run(async (u) => {
        const recorder: DriveLlmRecorder = {
          beforeWrite: async () => {
            if (attempt.before || attempt.wrote || attempt.call)
              return sourceStateInvalid();
            attempt.wrote = true;
            attempt.before = await captureDriveLlmPrewrite(u, entry.value);
          },
          terminal: async (value, outcome, now) => {
            if (
              !attempt.before ||
              !attempt.wrote ||
              attempt.call ||
              attempt.recording
            )
              return sourceStateInvalid();
            attempt.recording = true;
            attempt.call = await captureDriveLlmTerminal(
              u,
              value,
              outcome,
              now,
            );
          },
        };
        await terminal.work(u, recorder);
      });
    } catch (error) {
      if (
        !attempt.wrote &&
        !attempt.before &&
        isLlmOperationError(error) &&
        error.closed &&
        error.code !== "LLM_OWNERSHIP_UNKNOWN" &&
        error.code !== "LLM_DELIVERY_UNKNOWN"
      ) {
        entry.terminal = null;
        terminal.reject(error);
        return;
      }
      if (
        !isSystemError(error) ||
        error.code !== SystemErrorCode.DatabaseError
      ) {
        entry.phase = "unknown";
        return;
      }
    } finally {
      terminal.active = false;
    }
    await this.confirmDriveTerminal(entry);
  }
  private async confirmDriveTerminal(entry: DrivePending) {
    const terminal = entry.terminal;
    const attempt = terminal?.attempt;
    const proof = entry.proof;
    if (
      !terminal ||
      terminal.active ||
      !attempt?.before ||
      !attempt.call ||
      !proof ||
      !this.memory().consumed(proof, entry.lease)
    )
      return;
    terminal.active = true;
    try {
      const saved = await this.container.unitOfWorkProvider.run((u) =>
        captureDriveLlmPrewrite(u, entry.value),
      );
      if (driveLlmTerminalSaved(saved, attempt.before, attempt.call)) {
        this.drivePending.delete(entry.value.jobId);
        this.leases.delete(entry.value.jobId);
        this.leaseSources.delete(entry.value.jobId);
        this.retained.delete(entry.lease);
        terminal.resolve();
      } else if (sameDrivePrewrite(saved, attempt.before)) {
        terminal.attempt = null;
      }
    } finally {
      terminal.active = false;
    }
    if (entry.terminal === terminal && terminal.attempt === null)
      await this.runDriveTerminal(entry);
  }
  async recoverDriveCompletions() {
    for (const entry of this.drivePending.values()) {
      if (
        entry.phase === "unknown" ||
        entry.phase === "checking" ||
        entry.closingActive
      )
        continue;
      try {
        if (entry.phase === "saving") {
          entry.closingActive = true;
          try {
            await this.saveDriveClosed(entry);
          } finally {
            entry.closingActive = false;
          }
        } else if (entry.terminal?.attempt)
          await this.confirmDriveTerminal(entry);
        else if (entry.terminal) await this.runDriveTerminal(entry);
      } catch (error) {
        if (
          !isSystemError(error) ||
          error.code !== SystemErrorCode.DatabaseError
        )
          throw error;
      }
    }
  }
}

function samePreviewSource(left: PdfPreview, right: PdfPreview) {
  return (
    left.id === right.id &&
    left.accountId === right.accountId &&
    left.noteId === right.noteId &&
    left.noteVersion === right.noteVersion &&
    left.ownershipGeneration === right.ownershipGeneration &&
    left.credentialEpoch === right.credentialEpoch &&
    JSON.stringify(left.source) === JSON.stringify(right.source) &&
    JSON.stringify(left.access) === JSON.stringify(right.access)
  );
}

function queuedPreviewCancellationFence(
  candidate: PdfPreview,
  saved: PdfPreview,
) {
  return (
    candidate.state === "queued" &&
    candidate.owner.state === "idle" &&
    candidate.sourceMemoryBytes === 0 &&
    (!candidate.inputReceipt || candidate.inputReceipt.state === "closed") &&
    JSON.stringify(saved) ===
      JSON.stringify({
        ...candidate,
        state: "cancelled",
        cancelGeneration: candidate.cancelGeneration + 1,
        version: candidate.version + 1,
        updatedAt: saved.updatedAt,
      })
  );
}
