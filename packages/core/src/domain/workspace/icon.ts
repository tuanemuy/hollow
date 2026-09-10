import { BusinessRuleError } from "../error";

export const ICON_INPUT_BYTES = 5 * 1024 ** 2;
export const ICON_OUTPUT_BYTES = 512 * 1024;
export const ICON_TIMEOUT_MS = 30_000;
export type IconMime = "image/png" | "image/jpeg" | "image/webp";
export type IconOutput = Readonly<{
  bytes: number;
  sha256: string;
  width: number;
  height: number;
}>;
type IconBase = Readonly<{
  id: string;
  workspaceId: string;
  actorId: string;
  settingsVersion: number;
  inputBytes: number;
  mime: IconMime;
  storageKey: string;
  bytes: number;
  createdAt: Date;
  expiresAt: Date;
  nextAttemptAt: Date;
}>;
export type WorkspaceIcon = IconBase &
  (
    | Readonly<{
        state: "awaiting" | "processing" | "cleanup";
        output: IconOutput | null;
      }>
    | Readonly<{ state: "writing" | "ready"; output: IconOutput }>
  );
export function validateIconInput(
  bytes: number,
  mime: string,
): asserts mime is IconMime {
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > ICON_INPUT_BYTES)
    throw new BusinessRuleError(
      "ICON_SIZE",
      "アイコンは5 MiB以内の画像を選択してください。",
    );
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new BusinessRuleError(
      "ICON_FORMAT",
      "PNG・JPEG・WebPの画像を選択してください。",
    );
}
