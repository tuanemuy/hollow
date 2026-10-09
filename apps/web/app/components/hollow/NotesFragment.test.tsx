import {
  ForbiddenError,
  NotFoundError,
  SystemError,
} from "@repo/core/application/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrowseError,
  browseAccessLost,
  browseErrorMessage,
} from "@/components/browse/BrowseError";
import type { BrowseRouteSearch } from "@/presentation/browseInput";
import { extractSerializedError } from "@/presentation/errorResponse";
import { NotesFragment } from "./NotesFragment";

const mocks = vi.hoisted(() => ({ context: vi.fn(), browse: vi.fn() }));
vi.mock("@/presentation/hollowServer", () => ({
  hollowContext: mocks.context,
}));
vi.mock("@repo/core/application/browse/usecases", () => ({
  browseNotes: mocks.browse,
}));
const search: BrowseRouteSearch = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  query: "",
  tags: [],
  zone: "Asia/Tokyo",
  sort: "updated-desc",
  layout: "list",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ container: {}, token: "local-session" });
});
describe("streamed note list failure boundary", () => {
  it.each([
    new ForbiddenError("SCOPE", "この保存先にアクセスできません。"),
    new NotFoundError("SCOPE", "この保存先にアクセスできません。"),
  ])("preserves access guidance through a plain RSC prop for $name", async (failure) => {
    mocks.browse.mockRejectedValue(failure);
    const fragment = await NotesFragment({ search });
    expect(fragment.type).toBe(BrowseError);
    const error = fragment.props.error;
    expect(browseAccessLost(error)).toBe(true);
    expect(browseErrorMessage(error)).toBe(
      failure.toSerialized().kind === "forbidden"
        ? "権限がありません"
        : "対象が見つかりません",
    );
    expect(extractSerializedError(error).kind).toBe(
      failure.toSerialized().kind,
    );
  });
  it.each([
    new SystemError("NETWORK_ERROR", "private-password and provider-stack"),
    new Error("private-password and provider-stack"),
  ])("redacts internal failure before returning streamed client props", async (failure) => {
    mocks.browse.mockRejectedValue(failure);
    const fragment = await NotesFragment({ search });
    const error = fragment.props.error;
    expect(JSON.stringify(fragment.props)).not.toMatch(
      /private-password|provider-stack|NETWORK_ERROR/,
    );
    expect(extractSerializedError(error)).toMatchObject({
      code: null,
      message: "System error",
    });
    expect(browseErrorMessage(error)).toContain("再試行");
    expect(browseAccessLost(error)).toBe(false);
  });
});
