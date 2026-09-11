import { browseAccessLost } from "@/components/browse/BrowseError";
import { extractSerializedError } from "@/presentation/errorResponse";

export function tagAccessLost(error: unknown) {
  return (
    extractSerializedError(error).code !== "TAG_NOT_FOUND" &&
    browseAccessLost(error)
  );
}
