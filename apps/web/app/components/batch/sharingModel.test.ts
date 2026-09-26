import type {
  BatchConfirmation,
  BatchPreviewItem,
} from "@repo/core/application/batch/ports";
import { describe, expect, it } from "vitest";
import {
  acceptanceInput,
  type BatchContext,
  confirmationInput,
  sameBatchContext,
} from "./model";

const preview: BatchPreviewItem = {
  kind: "ready",
  noteId: "note",
  title: "title",
  move: null,
  latestAttemptId: null,
  baseSequence: 0,
  expected: {
    kind: "sharing",
    snapshot: {
      share: {
        noteId: "note",
        shareVersion: 8,
        noteVersion: 2,
        scope: {
          ownershipGeneration: 1,
          workspaceId: null,
          membershipRevision: 0,
          name: "personal",
          memberCount: 1,
        },
      },
      visibility: "private",
      hasPassword: true,
      hasLink: true,
      body: "present",
    },
  },
};
describe("sharing confirmation ownership", () => {
  it("never invents removal consent from preview and preserves explicit consent on ACK resend", () => {
    const first = confirmationInput(preview);
    expect(first).toMatchObject({ consent: { kind: "none" } });
    if (first.kind !== "ready" || first.expected.kind !== "sharing")
      throw Error("fixture");
    const confirmed: BatchConfirmation = {
      ...first,
      expected: first.expected,
      consent: { kind: "remove-password", noteId: "note", shareVersion: 8 },
    };
    const input = {
      requestId: "request",
      source: { kind: "personal" as const, accountId: "actor" },
      operation: { kind: "sharing" as const, visibility: "public" as const },
      items: [confirmed],
    };
    expect(acceptanceInput(input)).toEqual(input);
    expect(confirmationInput(preview)).toMatchObject({
      consent: { kind: "none" },
    });
  });
  it("rejects actor, route/filter and ABA generations including focus restoration", () => {
    const owner: BatchContext = {
      actorId: "a",
      actorEpoch: 1,
      contextKey: "one",
      contextEpoch: 3,
    };
    expect(sameBatchContext(owner, { ...owner })).toBe(true);
    for (const current of [
      null,
      { ...owner, actorId: "b" },
      { ...owner, actorEpoch: 3 },
      { ...owner, contextKey: "two" },
      { ...owner, contextEpoch: 5 },
    ])
      expect(sameBatchContext(owner, current)).toBe(false);
  });
});
