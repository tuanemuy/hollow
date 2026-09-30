import { z } from "zod";

export const DRIVE_PICKER_PATH = "/integrations/drive/picker";
export type DriveDocumentBinding =
  | Readonly<{ kind: "ordinary" }>
  | Readonly<{ kind: "unavailable" }>
  | Readonly<{ kind: "drive-picker"; nonce: string }>;

const nonce = z
  .string()
  .regex(/^[A-Za-z0-9+/]{22,}={0,2}$/)
  .max(128);

export function bindDriveDocument(input: {
  pathname: string;
  nonces: readonly string[];
  scriptNonces: readonly string[];
}): DriveDocumentBinding {
  if (input.pathname !== DRIVE_PICKER_PATH) return { kind: "ordinary" };
  const parsed = nonce.safeParse(input.nonces[0]);
  if (
    input.nonces.length !== 1 ||
    !parsed.success ||
    input.scriptNonces.length === 0 ||
    input.scriptNonces.some((value) => value !== parsed.data)
  )
    return { kind: "unavailable" };
  return { kind: "drive-picker", nonce: parsed.data };
}

// Capture before hydration or route heads can alter the original document.
const clientDocument: DriveDocumentBinding | undefined =
  typeof document === "undefined"
    ? undefined
    : bindDriveDocument({
        pathname: window.location.pathname,
        nonces: Array.from(
          document.querySelectorAll<HTMLMetaElement>(
            'meta[property="csp-nonce"]',
          ),
          (meta) => meta.content,
        ),
        scriptNonces: Array.from(document.scripts, (script) => script.nonce),
      });

export function driveDocumentBinding(context: unknown): DriveDocumentBinding {
  if (clientDocument) return clientDocument;
  const parsed = z
    .object({ drivePickerDocument: z.object({ nonce }) })
    .safeParse(context);
  return parsed.success
    ? { kind: "drive-picker", nonce: parsed.data.drivePickerDocument.nonce }
    : { kind: "ordinary" };
}

export function driveDocumentNavigation(
  binding: DriveDocumentBinding,
  href: string,
  preload: boolean,
): { kind: "stay" | "unavailable" } | { kind: "reload"; href: string } {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\"))
    return { kind: "unavailable" };
  const url = new URL(href, "https://hollow.invalid");
  if (
    url.origin !== "https://hollow.invalid" ||
    [...href].some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return { kind: "unavailable" };
  const entering = url.pathname === DRIVE_PICKER_PATH;
  if (binding.kind === "unavailable")
    return entering || preload
      ? { kind: "unavailable" }
      : { kind: "reload", href };
  if (entering === (binding.kind === "drive-picker")) return { kind: "stay" };
  if (preload) return { kind: "unavailable" };
  return { kind: "reload", href: entering ? DRIVE_PICKER_PATH : href };
}

export const driveReturnSearch = z.union([
  z
    .object({ controlId: z.uuid(), controlCommand: z.never().optional() })
    .strict(),
  z
    .object({ controlId: z.never().optional(), controlCommand: z.uuid() })
    .strict(),
  z
    .object({
      controlId: z.never().optional(),
      controlCommand: z.never().optional(),
    })
    .strict(),
]);
export type DriveReturnSearch = z.infer<typeof driveReturnSearch>;
