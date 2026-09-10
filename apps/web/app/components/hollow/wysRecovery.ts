export type WysOriginHint = Readonly<{
  noteId: string;
  revisionNo: number;
  capturedNoteVersion: number;
}>;
export type WysRecovery = Readonly<{
  version: 1;
  converted: boolean;
  originSaved: boolean;
  origin: WysOriginHint | null;
  invalidOrigin?: true;
}>;
export type WysSavedRestoreTarget = Readonly<{
  revisionNo: number;
  available: boolean;
}>;
export function acknowledgeWysRecovery(
  value: WysRecovery,
  originRevisionNo: number | undefined,
): WysRecovery {
  return {
    ...value,
    originSaved:
      value.originSaved ||
      Boolean(
        value.converted &&
          value.origin &&
          value.origin.revisionNo === originRevisionNo,
      ),
  };
}
export function wysAfterSourceEdit(
  previousHtml: string,
  html: string,
  value: WysRecovery | undefined,
): WysRecovery | undefined {
  return previousHtml === html || (value?.converted && !value.originSaved)
    ? value
    : undefined;
}
export function wysRestoreTarget(
  recovery: WysRecovery | undefined,
  saved: WysSavedRestoreTarget | null,
  pendingAvailable: boolean | undefined,
): (WysSavedRestoreTarget & { pending: boolean }) | null {
  if (recovery?.converted && recovery.origin)
    return {
      revisionNo: recovery.origin.revisionNo,
      available: pendingAvailable !== false,
      pending: !recovery.originSaved,
    };
  return saved ? { ...saved, pending: false } : null;
}
export function confirmWysRecoveryOrigin(
  value: WysRecovery,
  noteId: string,
  savedOrigin: WysSavedRestoreTarget | null,
  held: readonly { revisionNo: number; capturedNoteVersion: number }[],
): { recovery: WysRecovery; available: boolean } {
  const hint = value.origin;
  if (!hint)
    return { recovery: { ...value, originSaved: false }, available: false };
  const belongs = hint.noteId === noteId;
  const available =
    belongs &&
    held.some(
      (item) =>
        item.revisionNo === hint.revisionNo &&
        item.capturedNoteVersion === hint.capturedNoteVersion,
    );
  const originSaved = Boolean(
    value.originSaved &&
      belongs &&
      savedOrigin?.revisionNo === hint.revisionNo &&
      (!savedOrigin.available || available),
  );
  return {
    recovery: {
      ...value,
      originSaved,
      ...(!available && !originSaved ? { invalidOrigin: true as const } : {}),
    },
    available,
  };
}
export function readWysRecovery(value: unknown): WysRecovery | undefined {
  if (value === undefined) return undefined;
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("converted" in value) ||
    typeof value.converted !== "boolean"
  )
    return {
      version: 1,
      converted: true,
      originSaved: false,
      origin: null,
      invalidOrigin: true,
    };
  const origin = "origin" in value ? value.origin : null;
  const originSaved = "originSaved" in value && value.originSaved === true;
  if (origin === null)
    return {
      version: 1,
      converted: value.converted,
      originSaved,
      origin: null,
      ...("invalidOrigin" in value && value.invalidOrigin === true
        ? { invalidOrigin: true as const }
        : {}),
    };
  if (
    origin &&
    typeof origin === "object" &&
    "noteId" in origin &&
    typeof origin.noteId === "string" &&
    /^[0-9a-f-]{36}$/i.test(origin.noteId) &&
    "revisionNo" in origin &&
    typeof origin.revisionNo === "number" &&
    Number.isSafeInteger(origin.revisionNo) &&
    origin.revisionNo > 0 &&
    "capturedNoteVersion" in origin &&
    typeof origin.capturedNoteVersion === "number" &&
    Number.isSafeInteger(origin.capturedNoteVersion) &&
    origin.capturedNoteVersion >= 0
  )
    return {
      version: 1,
      converted: value.converted,
      originSaved,
      origin: {
        noteId: origin.noteId,
        revisionNo: origin.revisionNo,
        capturedNoteVersion: origin.capturedNoteVersion,
      },
    };
  return {
    version: 1,
    converted: value.converted,
    originSaved,
    origin: null,
    invalidOrigin: true,
  };
}
export const wysWarningKey = (userId: string) => `hollow:wys-warning:${userId}`;
export function shouldWarnWys(
  storage: Pick<Storage, "getItem">,
  userId: string,
): boolean {
  try {
    return storage.getItem(wysWarningKey(userId)) !== "hidden-v1";
  } catch {
    return true;
  }
}
