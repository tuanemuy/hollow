import type { WorkspaceDeletionResult } from "@repo/core/domain/workspace/deletion";
import { describe, expect, it } from "vitest";
import {
  acceptedDeletionResult,
  deletionIdentity,
  exactDeletionConfirmation,
  ownsDeletionOperation,
  ownsDeletionRequest,
  restoreDeletionIdentities,
  uncertainDeletionResult,
} from "./model";

const pending = {
  actorId: "alice",
  input: {
    workspaceId: "workspace",
    requestId: "request",
    confirmation: "東京Ａ",
  },
};
const accepted: WorkspaceDeletionResult = {
  requestId: "request",
  name: "東京Ａ",
  acceptedAt: "2026-09-19T09:00:00.000Z",
  state: "reclaiming",
  totalNotes: 0,
  completedNotes: 0,
  completedAt: null,
  delayed: false,
};

describe("workspace deletion confirmation", () => {
  it("retains only three IDs in actor memory and restores no confirmation or other actor", () => {
    const identities = [
      deletionIdentity(pending),
      { actorId: "bob", workspaceId: "other", requestId: "other-request" },
    ];
    expect(identities[0]).toEqual({
      actorId: "alice",
      workspaceId: "workspace",
      requestId: "request",
    });
    expect(restoreDeletionIdentities("alice", identities)).toEqual([
      {
        actorId: "alice",
        input: {
          workspaceId: "workspace",
          requestId: "request",
          confirmation: "",
        },
      },
    ]);
    expect(restoreDeletionIdentities("charlie", identities)).toEqual([]);
  });
  it("accepts only the exact current stored name", () => {
    expect(exactDeletionConfirmation("東京Ａ", "東京Ａ")).toBe(true);
    for (const name of [" 東京Ａ", "東京Ａ ", "東京A", "東京a", "東京"])
      expect(exactDeletionConfirmation("東京Ａ", name)).toBe(false);
    expect(exactDeletionConfirmation("", "")).toBe(false);
  });
  it("rejects confirmation after a rename", () => {
    expect(
      exactDeletionConfirmation("新しい名前", pending.input.confirmation),
    ).toBe(false);
  });
  it("restores a pending request only for its actor and workspace", () => {
    expect(ownsDeletionRequest(pending, "alice", "workspace")).toBe(true);
    expect(ownsDeletionRequest(pending, "bob", "workspace")).toBe(false);
    expect(ownsDeletionRequest(pending, "alice", "another")).toBe(false);
    expect(ownsDeletionRequest(null, "alice", "workspace")).toBe(false);
  });
  it("never interprets an absent receipt as confirmed acceptance", () => {
    expect(acceptedDeletionResult(null, "request")).toBe(false);
    expect(acceptedDeletionResult(accepted, "another")).toBe(false);
    expect(acceptedDeletionResult(accepted, "request")).toBe(true);
  });
  it("distinguishes uncertain transport outcomes from a known refusal", () => {
    expect(uncertainDeletionResult(new Error("connection lost"))).toBe(true);
    expect(
      uncertainDeletionResult({
        serialized: {
          kind: "system",
          code: "EXTERNAL_API_ERROR",
          message: "failed",
        },
      }),
    ).toBe(true);
    expect(
      uncertainDeletionResult({
        serialized: {
          kind: "business",
          code: "WORKSPACE_NAME",
          message: "name changed",
        },
      }),
    ).toBe(false);
  });
  it("rejects old responses after actor change or unmount", () => {
    const token = Symbol();
    expect(ownsDeletionOperation(true, "alice", "alice", token, token)).toBe(
      true,
    );
    expect(ownsDeletionOperation(true, "alice", "bob", token, token)).toBe(
      false,
    );
    expect(ownsDeletionOperation(false, "alice", "alice", token, token)).toBe(
      false,
    );
    expect(ownsDeletionOperation(true, "alice", null, token, token)).toBe(
      false,
    );
  });
  it("does not let an earlier attempt own a new operation or cleared session", () => {
    const old = Symbol();
    const current = Symbol();
    expect(ownsDeletionOperation(true, "alice", "alice", current, old)).toBe(
      false,
    );
    expect(ownsDeletionOperation(true, "alice", "alice", null, old)).toBe(
      false,
    );
  });
});
