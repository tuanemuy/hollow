import { completeMachine } from "@repo/core/application/regeneration/completion";
import {
  cancelMachineRegeneration,
  undoMachineBody,
} from "@repo/core/application/regeneration/control";
import { finishInput } from "@repo/core/application/regeneration/memory";
import { getMachineCommand } from "@repo/core/application/regeneration/read";
import { requestMachineRegeneration } from "@repo/core/application/regeneration/request";
import { sweepMachine } from "@repo/core/application/regeneration/worker";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { editNote } from "@repo/core/domain/note/entity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { machineFixture, now } from "./machineRegenerationFixtures";

describe("machine regeneration application", () => {
  let f: Awaited<ReturnType<typeof machineFixture>>;
  beforeAll(async () => {
    f = await machineFixture(false);
  });
  afterAll(async () => {
    await f.close();
  });
  it.each([
    "html",
    "markdown",
  ] as const)("adopts %s and undoes preserving the current title", async (format) => {
    try {
      const noteId = await f.seed(format, "<p>new machine body</p>");
      const commandId = f.c.idGenerator.next();
      const first = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId,
      });
      expect(
        await requestMachineRegeneration(f.c, f.token, { noteId, commandId }),
      ).toEqual(first);
      const pendingView = await getMachineCommand(f.c, f.token, { noteId });
      expect(pendingView).toMatchObject({
        id: first.jobId,
        phase: "queued",
        undoAvailable: false,
      });
      await sweepMachine(f.c);
      const row = await f.settled(first.jobId);
      expect(row.outcome).toBe("succeeded");
      expect(row.inputReceipt?.state).toBe("closed");
      expect(f.input.activeInputs()).toBe(0);
      expect(
        await f.c.unitOfWorkProvider.run((u) =>
          u.llmQuota.reservation(first.jobId),
        ),
      ).toBeNull();
      const completedView = await getMachineCommand(f.c, f.token, { noteId });
      expect(completedView).toMatchObject({
        id: first.jobId,
        outcome: "succeeded",
        undoAvailable: true,
      });
      expect(completedView).toEqual(
        await getMachineCommand(f.c, f.token, { noteId, commandId }),
      );
      expect(Object.keys(completedView ?? {}).sort()).toEqual(
        [
          "id",
          "noteId",
          "phase",
          "outcome",
          "failure",
          "cancelRequested",
          "ownershipUnconfirmed",
          "createdAt",
          "updatedAt",
          "resultVersion",
          "undoAvailable",
        ].sort(),
      );
      await undoMachineBody(f.c, f.token, first.jobId);
      expect(await getMachineCommand(f.c, f.token, { noteId })).toMatchObject({
        undoAvailable: false,
      });
      expect(
        (await f.c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
          ?.html,
      ).toBe("<p>previous body</p>");
    } catch (e) {
      f.fail();
      throw e;
    }
  });
  it("preserves the genuine closed input while the machine owner is still active", async () => {
    try {
      const noteId = await f.seed("html", "<p>unused closed input</p>");
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      const owned = await f.claimUnused(jobId);
      const proof = f.input.finish(owned.lease, f.c.idGenerator.next());
      await finishInput(f.c, f.sourceServices, proof);
      const saved = await f.c.unitOfWorkProvider.run((u) =>
        u.machineRegenerations.find(jobId),
      );
      expect(saved?.owner.state).toBe("active");
      expect(saved?.phase).toBe("acquiring");
      expect(saved?.inputReceipt).toEqual(proof.receipt);
      expect(saved?.sourceMemoryBytes).toBe(0);
      expect(f.input.activeInputs()).toBe(0);
      expect(f.input.consumed(proof, owned.lease)).toBe(true);
      expect(
        (await f.c.unitOfWorkProvider.run((u) => u.jobs.find(jobId)))?.state,
      ).toBe("running");
      expect(
        await f.c.unitOfWorkProvider.run((u) => u.llmQuota.reservation(jobId)),
      ).toBeNull();
      if (!saved) throw Error("S5_UNUSED_SAVED");
      await f.c.unitOfWorkProvider.run((u) =>
        completeMachine(f.c, u, saved, "failed", "S5_UNUSED_CLOSED"),
      );
    } catch (error) {
      f.fail();
      throw error;
    }
  });
  it("cancels a queued request without an original read or quota reservation", async () => {
    try {
      const noteId = await f.seed("html", "<p>cancelled input</p>");
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      expect(
        await f.c.unitOfWorkProvider.run((u) =>
          u.jobs.claim(
            now,
            f.c.idGenerator.next(),
            new Date(now.getTime() + 60000),
          ),
        ),
      ).toBeNull();
      expect(
        (
          await f.c.unitOfWorkProvider.run((u) =>
            u.machineRegenerations.find(jobId),
          )
        )?.phase,
      ).toBe("queued");
      await cancelMachineRegeneration(f.c, f.token, jobId);
      const row = await f.settled(jobId);
      expect(row.outcome).toBe("cancelled");
      expect(row.inputReceipt).toBeNull();
      expect(f.input.activeInputs()).toBe(0);
    } catch (e) {
      f.fail();
      throw e;
    }
  });
  it("holds the original execution until a lost finish response is exactly reconciled", async () => {
    try {
      const noteId = await f.seed("html", "<p>held derived body</p>");
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      f.faults.finishReply = true;
      await sweepMachine(f.c);
      for (
        let n = 0;
        n < 200 && !f.c.machine?.progress.pendingCompletion(jobId);
        n++
      )
        await new Promise((resolve) => setTimeout(resolve, 10));
      const held = f.c.machine?.progress.pendingCompletion(jobId);
      expect(held?.proof).not.toBeNull();
      expect(f.c.machine?.execution.active(jobId)).toBe(true);
      expect(f.input.activeInputs()).toBe(1);
      expect(
        (await f.c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
          ?.html,
      ).toBe("<p>previous body</p>");
      await sweepMachine(f.c);
      const ended = await f.settled(jobId);
      expect(ended.outcome).toBe("failed");
      expect(f.input.activeInputs()).toBe(0);
      expect(f.c.machine?.execution.active(jobId)).toBe(false);
      expect(
        (await f.c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
          ?.html,
      ).toBe("<p>previous body</p>");
    } catch (error) {
      f.fail();
      throw error;
    }
  });

  it("keeps the previous body on sanitize failure and terminates atomically", async () => {
    try {
      const noteId = await f.seed("html", "<p>never adopted</p>");
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      f.faults.sanitize = true;
      await sweepMachine(f.c);
      const ended = await f.settled(jobId);
      expect(ended.outcome).toBe("failed");
      expect(
        (await f.c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
          ?.version,
      ).toBe(0);
      expect(f.input.activeInputs()).toBe(0);
    } catch (error) {
      f.fail();
      throw error;
    } finally {
      f.faults.sanitize = false;
    }
  });
  it("fences an expired queued request before reserving or reading input", async () => {
    try {
      const noteId = await f.seed("html", "<p>expired input</p>");
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      f.setNow(new Date(now.getTime() + 120001));
      await sweepMachine(f.c);
      const ended = await f.settled(jobId);
      expect(ended.outcome).toBe("failed");
      expect(ended.inputReceipt).toBeNull();
      expect(f.input.activeInputs()).toBe(0);
      expect(
        (await f.c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
          ?.html,
      ).toBe("<p>previous body</p>");
    } catch (error) {
      f.fail();
      throw error;
    } finally {
      f.setNow(now);
    }
  });
});

describe("machine regeneration final fence", () => {
  let f: Awaited<ReturnType<typeof machineFixture>>;
  beforeAll(async () => {
    f = await machineFixture(false, true);
  });
  afterAll(async () => {
    await f.close();
  });
  it.each([
    ["C-F1", "authorization"],
    ["C-F2", "note version"],
    ["C-F3", "revision head"],
  ] as const)("%s rejects changed %s in the final transaction", async (code, _reason) => {
    const gate = f.pauseProjection();
    try {
      const workspace = code === "C-F1" ? await f.fenceWorkspace() : null;
      const noteId = await f.seed(
        "html",
        "<p>must not be adopted</p>",
        workspace?.workspaceId,
      );
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      await sweepMachine(f.c);
      await gate.entered;
      const held = f.c.machine?.progress.owned(jobId);
      if (!held?.proof) throw Error("S5_FENCE_PROOF");
      const proof = held.proof;
      expect(f.input.consumed(proof, held.lease)).toBe(true);
      expect(f.input.activeInputs()).toBe(0);
      expect(f.c.machine?.execution.active(jobId)).toBe(true);
      const snapshot = await f.c.unitOfWorkProvider.run(async (u) => ({
        note: await u.notes.findById(noteId),
        head: await u.revisions.head(noteId),
        revisions: await u.revisions.list(noteId),
        operation: await u.machineRegenerations.find(jobId),
        original: await u.imports.findByNote(noteId),
      }));
      if (
        !snapshot.note ||
        !snapshot.head ||
        !snapshot.operation ||
        !snapshot.original
      )
        throw Error("S5_FENCE_SNAPSHOT");
      const original = snapshot.original;
      expect(snapshot.operation.phase).toBe("preparing");
      expect(snapshot.operation.inputReceipt).toEqual(proof.receipt);
      expect(snapshot.operation.sourceMemoryBytes).toBe(0);
      expect(snapshot.operation.owner.state).toBe("active");
      expect(snapshot.operation.resultVersion).toBeNull();
      if (workspace) {
        expect(
          await getMachineCommand(f.c, workspace.ownerToken, { noteId }),
        ).toBeNull();
        await changeWorkspaceMember(f.c, workspace.ownerToken, {
          workspaceId: workspace.workspaceId,
          accountId: f.accountId,
          role: "viewer",
          expectedRole: "editor",
          ownerConfirmed: false,
        });
        const changed = await f.c.unitOfWorkProvider.run(async (u) => ({
          role: await u.workspaces.role(workspace.workspaceId, f.accountId),
          note: await u.notes.findById(noteId),
          job: await u.jobs.find(jobId),
        }));
        expect(changed.role).toBe("viewer");
        await expect(
          getMachineCommand(f.c, f.token, { noteId }),
        ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
        expect(changed.note?.version).toBe(snapshot.note.version);
        expect(changed.job?.state).toBe("cancelled");
      } else if (code === "C-F2") {
        await f.c.unitOfWorkProvider.run(async (u) => {
          const note = await u.notes.findById(noteId);
          if (!note) throw Error("S5_FENCE_NOTE");
          await u.notes.save(
            editNote(note, note.title, "<p>concurrent body</p>", now),
            note.version,
          );
        });
      } else {
        await f.c.unitOfWorkProvider.run(async (u) => {
          const head = await u.revisions.head(noteId);
          const revision = head
            ? await u.revisions.find(noteId, head.currentNo)
            : null;
          if (!head || !revision) throw Error("S5_FENCE_REVISION");
          await u.revisions.insert({
            ...revision,
            revisionNo: head.currentNo + 1,
            actor: { kind: "user", accountId: f.accountId },
            cause: "manual",
            savedAt: now,
          });
          await u.revisions.saveHead({
            ...head,
            currentNo: head.currentNo + 1,
          });
        });
      }
      const external = await f.c.unitOfWorkProvider.run(async (u) => ({
        note: await u.notes.findById(noteId),
        head: await u.revisions.head(noteId),
        revisions: await u.revisions.list(noteId),
        entries: await u.references.entries(noteId),
        notices: await u.imports.listNotices(original.id),
      }));
      expect(external.note?.version).toBe(
        snapshot.note.version + (code === "C-F2" ? 1 : 0),
      );
      expect(external.head?.currentNo).toBe(
        snapshot.head.currentNo + (code === "C-F3" ? 1 : 0),
      );
      gate.release();
      const ended = await f.settled(jobId);
      expect(ended.phase).toBe("terminal");
      expect(ended.outcome).toBe("failed");
      expect(ended.failure).toBe("REGENERATION_SOURCE_CHANGED");
      expect(ended.owner.state).toBe("closed");
      expect(ended.sourceMemoryBytes).toBe(0);
      expect(ended.inputReceipt).toEqual(proof.receipt);
      expect(ended.resultVersion).toBeNull();
      expect(f.input.consumed(proof, held.lease)).toBe(true);
      expect(f.input.activeInputs()).toBe(0);
      expect(f.c.machine?.progress.owned(jobId)).toBeNull();
      expect(f.c.machine?.execution.active(jobId)).toBe(false);
      const saved = await f.c.unitOfWorkProvider.run(async (u) => ({
        note: await u.notes.findById(noteId),
        head: await u.revisions.head(noteId),
        revisions: await u.revisions.list(noteId),
        entries: await u.references.entries(noteId),
        notices: await u.imports.listNotices(original.id),
        original: await u.imports.findOriginal(original.id),
        job: await u.jobs.find(jobId),
        quota: await u.llmQuota.reservation(jobId),
      }));
      expect(saved.note).toEqual(external.note);
      expect(saved.head).toEqual(external.head);
      expect(saved.revisions).toEqual(external.revisions);
      expect(saved.entries).toEqual(external.entries);
      expect(saved.notices).toEqual(external.notices);
      expect(saved.original?.state).toBe(snapshot.operation.previous.state);
      expect(saved.original?.coverage).toBe(
        snapshot.operation.previous.coverage,
      );
      expect(saved.original?.sha256).toBe(snapshot.original.sha256);
      expect(saved.job?.state).toBe("failed");
      expect(saved.job?.leaseToken).toBeNull();
      expect(saved.quota).toBeNull();
      if (workspace) {
        expect(
          await getMachineCommand(f.c, workspace.ownerToken, { noteId }),
        ).toBeNull();
        await changeWorkspaceMember(f.c, workspace.ownerToken, {
          workspaceId: workspace.workspaceId,
          accountId: f.accountId,
          role: "editor",
          expectedRole: "viewer",
          ownerConfirmed: false,
        });
        await sweepMachine(f.c);
        expect(await f.settled(jobId)).toEqual(ended);
        expect(
          (await f.c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
            ?.html,
        ).toBe(snapshot.note.html);
      }
    } catch (error) {
      f.fail();
      throw error;
    } finally {
      gate.release();
    }
  });
});
