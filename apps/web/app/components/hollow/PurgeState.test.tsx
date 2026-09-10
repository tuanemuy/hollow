import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PurgeConfirm } from "./PurgeConfirm";
import {
  type PurgeRequest,
  purgeIsActive,
  purgeNeedsRefresh,
  purgeRequestLabel,
  purgeStateLabel,
  reconcilePurgeRequests,
} from "./PurgeState";

const unknown: PurgeRequest = {
  kind: "unknown",
  noteId: "note",
  operationId: "generation",
  title: "title",
};
const accepted: PurgeRequest = {
  ...unknown,
  kind: "accepted",
  purgeId: "purge",
};
describe("irreversible purge request reconciliation", () => {
  it("does not treat a failed request or an absent first-page row as deleted or restorable", () => {
    expect(reconcilePurgeRequests([unknown], {})).toEqual([unknown]);
    expect(reconcilePurgeRequests([unknown], { trash: [] })).toEqual([unknown]);
    expect(
      reconcilePurgeRequests([unknown], { trash: [{ id: "other" }] }),
    ).toEqual([unknown]);
    expect(reconcilePurgeRequests([unknown], { purges: [] })).toEqual([
      unknown,
    ]);
    expect(purgeRequestLabel(unknown)).toContain("受付結果を確認できません");
  });
  it("uses a fresh trash result to release an unknown row for current server-side checks", () => {
    expect(
      reconcilePurgeRequests([unknown], { trash: [{ id: "note" }] }),
    ).toEqual([]);
  });
  it("never rolls an acknowledged irreversible request back based on stale trash data", () => {
    expect(
      reconcilePurgeRequests([accepted], { trash: [{ id: "note" }] }),
    ).toEqual([accepted]);
    expect(purgeRequestLabel(accepted)).toContain("復元はできません");
    expect(purgeRequestLabel(accepted)).not.toContain("削除が完了");
  });
  it("replaces a pending receipt only with its own server purge record", () => {
    expect(
      reconcilePurgeRequests([unknown, { ...accepted, noteId: "second" }], {
        purges: [{ noteId: "note" }],
      }),
    ).toEqual([{ ...accepted, noteId: "second" }]);
  });
  it("keeps an in-flight request fenced until a purge record arrives", () => {
    const requesting: PurgeRequest = { ...unknown, kind: "requesting" };
    expect(
      reconcilePurgeRequests([requesting], { trash: [{ id: "note" }] }),
    ).toEqual([requesting]);
    expect(
      reconcilePurgeRequests([requesting], { purges: [{ noteId: "note" }] }),
    ).toEqual([]);
  });
});
describe("purge status presentation", () => {
  it.each([
    "queued",
    "running",
  ] as const)("polls only active %s work and does not label it complete", (state) => {
    expect(purgeIsActive({ state })).toBe(true);
    expect(purgeStateLabel({ state })).not.toContain("が完了");
  });
  it.each([
    "failed",
    "succeeded",
  ] as const)("stops periodic polling for %s work", (state) => {
    expect(purgeIsActive({ state })).toBe(false);
  });
  it("distinguishes accepted, failed cleanup, and confirmed completion", () => {
    expect(purgeStateLabel({ state: "queued" })).toContain("受付済み");
    expect(purgeStateLabel({ state: "failed" })).toContain("再試行待ち");
    expect(purgeNeedsRefresh({ state: "failed" })).toBe(true);
    expect(purgeNeedsRefresh({ state: "succeeded" })).toBe(false);
    expect(purgeStateLabel({ state: "succeeded" })).toBe("完全削除が完了");
  });
});
describe("purge confirmation initial markup", () => {
  it("escapes the title, explains irreversible scope and never enables initial destructive submission", () => {
    const markup = renderToString(
      createElement(PurgeConfirm, {
        title: '<script>alert("x")</script>',
        pending: false,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }),
    );
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).toContain("取り消し・復元はできません");
    expect(markup).toContain("すべての版");
    expect(markup).toContain("元ファイル");
    expect(markup).toContain('disabled="">完全削除を実行');
    expect(markup).not.toContain("ゴミ箱を空にする");
    expect(markup).not.toContain("Drive");
  });
});
