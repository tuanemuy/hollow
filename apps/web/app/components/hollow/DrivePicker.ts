import type { DriveInitialInput } from "@repo/core/application/integration/drive/control";
import { z } from "zod";

export type PickerNotice =
  | { kind: "opening" | "closed" | "unknown" | "failed" }
  | { kind: "open"; pickerExpiresAt: string; accessExpiresAt: string };
export type PickerLocator = { kind: "control"; id?: string; commandId: string };
export type PickerSdk = (input: {
  current: () => boolean;
  accessToken: string;
  appId: string;
  apiKey: string;
  selected: (value: unknown) => void;
  cancelled: () => void;
}) => Promise<{ dispose(): void }>;

const bounded = (max: number) =>
  z
    .string()
    .min(1)
    .refine((v) => new TextEncoder().encode(v).byteLength <= max);
const locator = z.object({ id: z.uuid(), commandId: z.uuid() });
const selection = z
  .object({ id: bounded(1024), resourceKey: bounded(1024).nullable() })
  .strict();
const issued = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("receipt"), receipt: locator }),
  z.object({
    kind: z.literal("issued"),
    receipt: locator,
    picker: z
      .object({
        accessToken: bounded(65536),
        ticket: bounded(4096),
        appId: z.string().regex(/^[0-9]{1,32}$/),
        apiKey: bounded(256),
        pickerExpiresAt: z.iso.datetime({ offset: true }),
        accessExpiresAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
  }),
]);

async function boundedJson(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("DRIVE_RESPONSE");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw Error("DRIVE_RESPONSE");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    data.set(part, offset);
    offset += part.byteLength;
  }
  const value = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(data),
  ) as unknown;
  if (!response.ok) throw Error("DRIVE_RESPONSE");
  return z.object({ ok: z.literal(true), value: z.unknown() }).parse(value)
    .value;
}

export function createDrivePickerController(input: {
  current: () => boolean;
  notice: (value: PickerNotice) => void;
  receipt: (value: PickerLocator) => void;
  fetch?: typeof fetch;
  sdk?: PickerSdk;
  now?: () => number;
}) {
  let generation = 0;
  let view: { dispose(): void } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  let clearSecrets = () => {};
  const now = input.now ?? Date.now;
  const post = async (url: string, data: unknown) =>
    boundedJson(
      await (input.fetch ?? fetch)(url, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    );
  const dispose = () => {
    generation++;
    active = false;
    clearSecrets();
    clearSecrets = () => {};
    if (timer) clearTimeout(timer);
    timer = null;
    view?.dispose();
    view = null;
  };
  return {
    dispose,
    async open(initial: DriveInitialInput) {
      if (active || !input.current()) return;
      active = true;
      const expected = ++generation;
      const current = () => expected === generation && input.current();
      const notice = (value: PickerNotice) => {
        if (current()) input.notice(value);
      };
      notice({ kind: "opening" });
      try {
        const result = issued.parse(
          await post("/api/integrations/drive/picker", initial),
        );
        if (!current()) return;
        input.receipt({ kind: "control", ...result.receipt });
        if (result.kind === "receipt") {
          active = false;
          notice({ kind: "unknown" });
          return;
        }
        let secret: typeof result.picker | null = result.picker;
        const eraseSecrets = () => {
          if (secret) {
            secret.accessToken = "";
            secret.ticket = "";
          }
          secret = null;
        };
        clearSecrets = eraseSecrets;
        const pickerId = result.receipt.id;
        const { pickerExpiresAt, accessExpiresAt } = result.picker;
        const end = () => {
          eraseSecrets();
          if (expected === generation) dispose();
        };
        const deadline = Math.min(
          Date.parse(secret.pickerExpiresAt),
          Date.parse(secret.accessExpiresAt),
        );
        if (deadline <= now()) {
          notice({ kind: "failed" });
          end();
          return;
        }
        timer = setTimeout(
          () => {
            notice({ kind: "closed" });
            end();
          },
          Math.min(deadline - now(), 300000),
        );
        const built = await (input.sdk ?? googleDrivePicker)({
          current: () => current() && secret !== null && deadline > now(),
          get accessToken() {
            return current() && secret && deadline > now()
              ? secret.accessToken
              : "";
          },
          appId: secret.appId,
          apiKey: secret.apiKey,
          cancelled: () => {
            notice({ kind: "closed" });
            end();
          },
          selected: (raw) => {
            if (!current() || !secret || deadline <= now()) return;
            const parsed = selection.safeParse(raw);
            if (!parsed.success) {
              notice({ kind: "failed" });
              end();
              return;
            }
            const body = {
              commandId: crypto.randomUUID(),
              expectedEpoch: initial.expectedEpoch,
              expectedSettingsVersion: initial.expectedSettingsVersion,
              pickerId,
              ticket: secret.ticket,
              fileId: parsed.data.id,
              resourceKey: parsed.data.resourceKey,
            };
            eraseSecrets();
            input.receipt({ kind: "control", commandId: body.commandId });
            void post("/api/integrations/drive/selection", body)
              .then((value) => {
                if (!current()) return;
                const row = z.object({ row: locator }).parse(value).row;
                input.receipt({ kind: "control", ...row });
                notice({ kind: "closed" });
              })
              .catch(() => {
                notice({ kind: "unknown" });
              })
              .finally(end);
          },
        });
        if (!current()) {
          built.dispose();
          return;
        }
        view = built;
        notice({ kind: "open", pickerExpiresAt, accessExpiresAt });
      } catch {
        notice({ kind: "unknown" });
        if (expected === generation) dispose();
      }
    },
  };
}

interface DocsView {
  setIncludeFolders(value: boolean): DocsView;
  setSelectFolderEnabled(value: boolean): DocsView;
  setEnableDrives(value: boolean): DocsView;
  setMimeTypes(value: string): DocsView;
}
interface PickerView {
  setVisible(value: boolean): void;
  dispose(): void;
}
interface PickerBuilder {
  setDeveloperKey(value: string): PickerBuilder;
  setAppId(value: string): PickerBuilder;
  setOAuthToken(value: string): PickerBuilder;
  addView(view: DocsView): PickerBuilder;
  setCallback(callback: (data: unknown) => void): PickerBuilder;
  build(): PickerView;
}
declare global {
  interface Window {
    gapi?: {
      load(
        name: string,
        options: {
          callback(): void;
          onerror(): void;
          timeout: number;
          ontimeout(): void;
        },
      ): void;
    };
    google?: {
      picker?: {
        DocsView: new () => DocsView;
        PickerBuilder: new () => PickerBuilder;
        Action: { PICKED: string; CANCEL: string };
      };
    };
  }
}
export const googleDrivePicker: PickerSdk = async (input) => {
  const { selected, cancelled } = input;
  const assertCurrent = () => {
    if (!input.current()) throw Error("DRIVE_SDK");
  };
  assertCurrent();
  if (!window.gapi) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        reject(Error("DRIVE_SDK"));
      }, 10000);
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(Error("DRIVE_SDK"));
      };
      document.head.appendChild(script);
    });
  }
  assertCurrent();
  const gapi = window.gapi;
  if (!gapi) throw Error("DRIVE_SDK");
  await new Promise<void>((resolve, reject) =>
    gapi.load("picker", {
      callback: resolve,
      onerror: () => reject(Error("DRIVE_SDK")),
      timeout: 10000,
      ontimeout: () => reject(Error("DRIVE_SDK")),
    }),
  );
  assertCurrent();
  const sdk = window.google?.picker;
  if (!sdk) throw Error("DRIVE_SDK");
  const folderView = new sdk.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setEnableDrives(true)
    .setMimeTypes(
      "application/vnd.google-apps.folder,application/vnd.google-apps.shortcut",
    );
  assertCurrent();
  const picker = new sdk.PickerBuilder()
    .setDeveloperKey(input.apiKey)
    .setAppId(input.appId)
    .setOAuthToken(input.accessToken)
    .addView(folderView)
    .setCallback((raw) => {
      const value = z
        .object({
          action: z.string(),
          docs: z
            .array(
              z.object({
                id: bounded(1024),
                resourceKey: z.string().optional(),
              }),
            )
            .max(1)
            .optional(),
        })
        .safeParse(raw);
      if (!value.success) return;
      if (value.data.action === sdk.Action.CANCEL) cancelled();
      if (value.data.action === sdk.Action.PICKED) {
        const doc = value.data.docs?.[0];
        selected(
          doc ? { id: doc.id, resourceKey: doc.resourceKey || null } : null,
        );
      }
    })
    .build();
  picker.setVisible(true);
  return { dispose: () => picker.dispose() };
};
