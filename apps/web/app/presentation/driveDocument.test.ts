import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindDriveDocument,
  DRIVE_PICKER_PATH,
  driveDocumentNavigation,
  driveReturnSearch,
} from "./driveDocument";

const nonce = "abcdefghijklmnopqrstuvwx12345678";
const valid = {
  pathname: DRIVE_PICKER_PATH,
  nonces: [nonce],
  scriptNonces: [nonce, nonce],
};
afterEach(() => vi.unstubAllGlobals());
describe("immutable Drive document boundary", () => {
  it("requires one nonce and matching server scripts on the original dedicated pathname", () => {
    expect(bindDriveDocument(valid)).toEqual({ kind: "drive-picker", nonce });
    expect(
      bindDriveDocument({ ...valid, pathname: "/settings/drive" }),
    ).toEqual({ kind: "ordinary" });
    for (const input of [
      { ...valid, nonces: [] },
      { ...valid, nonces: [nonce, nonce] },
      { ...valid, scriptNonces: [] },
      { ...valid, scriptNonces: [nonce, "different"] },
      { ...valid, nonces: ["short"] },
    ])
      expect(bindDriveDocument(input)).toEqual({ kind: "unavailable" });
  });
  it("does not promote an ordinary document after location or head changes", async () => {
    vi.resetModules();
    const location = { pathname: "/settings/drive" };
    const metas = [{ content: nonce }];
    vi.stubGlobal("window", { location });
    vi.stubGlobal("document", {
      querySelectorAll: () => metas,
      scripts: [{ nonce }],
    });
    const loaded = await import("./driveDocument");
    location.pathname = DRIVE_PICKER_PATH;
    metas[0] = { content: "anotherNonceabcdefghijklmnopqr12" };
    expect(
      loaded.driveDocumentBinding({ drivePickerDocument: { nonce } }),
    ).toEqual({ kind: "ordinary" });
    expect(
      loaded.driveDocumentNavigation(
        loaded.driveDocumentBinding(undefined),
        DRIVE_PICKER_PATH,
        false,
      ),
    ).toEqual({ kind: "reload", href: DRIVE_PICKER_PATH });
  });
  it("uses full document entry and exit but preserves ordinary SPA navigation", () => {
    const ordinary = { kind: "ordinary" } as const;
    const picker = { kind: "drive-picker", nonce } as const;
    expect(
      driveDocumentNavigation(
        ordinary,
        `${DRIVE_PICKER_PATH}?ignored=yes`,
        false,
      ),
    ).toEqual({ kind: "reload", href: DRIVE_PICKER_PATH });
    expect(
      driveDocumentNavigation(picker, "/notes/jobs?x=1#result", false),
    ).toEqual({ kind: "reload", href: "/notes/jobs?x=1#result" });
    expect(driveDocumentNavigation(ordinary, "/notes/jobs", false)).toEqual({
      kind: "stay",
    });
    expect(driveDocumentNavigation(picker, DRIVE_PICKER_PATH, false)).toEqual({
      kind: "stay",
    });
    for (const href of [
      "//external.test",
      "https://external.test",
      "/\\external.test",
      "/\t/external.test",
    ])
      expect(driveDocumentNavigation(picker, href, false)).toEqual({
        kind: "unavailable",
      });
  });
  it("refuses cross-document preloads and unavailable direct entries without reload loops", () => {
    expect(
      driveDocumentNavigation({ kind: "ordinary" }, DRIVE_PICKER_PATH, true),
    ).toEqual({ kind: "unavailable" });
    expect(
      driveDocumentNavigation(
        { kind: "drive-picker", nonce },
        "/notes/jobs",
        true,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      driveDocumentNavigation(
        { kind: "unavailable" },
        DRIVE_PICKER_PATH,
        false,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      driveDocumentNavigation({ kind: "unavailable" }, "/settings/drive", true),
    ).toEqual({ kind: "unavailable" });
  });
  it("accepts only an exclusive UUID return locator and no arbitrary or secret fields", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    for (const search of [{}, { controlId: id }, { controlCommand: id }])
      expect(driveReturnSearch.safeParse(search).success).toBe(true);
    for (const search of [
      { controlId: id, controlCommand: id },
      { controlId: "x" },
      { token: "synthetic" },
      { returnTo: "/notes" },
      { controlId: id, resourceKey: "synthetic" },
    ])
      expect(driveReturnSearch.safeParse(search).success).toBe(false);
  });
});
