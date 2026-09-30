import { ConflictError } from "@repo/core/application/errors";
import { z } from "zod";

const bytes = (limit: number) =>
  z
    .string()
    .min(1)
    .refine((value) => new TextEncoder().encode(value).byteLength <= limit);
const version = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const epoch = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const driveAutoSettingSchema = z
  .object({
    expectedEpoch: epoch,
    expectedSettingsVersion: version,
    enabled: z.boolean(),
  })
  .strict();
const confirmation = z
  .object({
    version: z.literal(1),
    expectedEpoch: epoch,
    sequence: epoch,
    backupImpact: z
      .object({
        count: epoch.max(50002),
        fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .optional(),
    ids: z
      .array(z.uuid())
      .max(11)
      .refine((ids) => new Set(ids).size === ids.length),
    backupIds: z
      .array(z.uuid())
      .max(11)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
  })
  .strict();
export const driveInitialSchema = z
  .object({
    commandId: z.uuid(),
    expectedEpoch: epoch,
    expectedSettingsVersion: version,
  })
  .strict();
export const driveBeginSchema = driveInitialSchema
  .extend({
    consent: z.boolean(),
    chooseAccount: z.boolean(),
    confirmation,
  })
  .strict();
export const driveDisconnectSchema = driveInitialSchema
  .extend({ confirmation })
  .strict();
export const driveLookupSchema = z.discriminatedUnion("by", [
  z
    .object({
      by: z.literal("id"),
      kind: z.enum(["authorization", "control"]),
      id: z.uuid(),
    })
    .strict(),
  z
    .object({
      by: z.literal("command"),
      kind: z.enum(["authorization", "control"]),
      commandId: z.uuid(),
    })
    .strict(),
]);
export const driveCancelSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["authorization", "control"]),
    expectedVersion: version,
  })
  .strict();
export const driveContinueSchema = z.discriminatedUnion("action", [
  z
    .object({
      id: z.uuid(),
      expectedVersion: version,
      phase: z.literal("ready"),
      action: z.literal("confirm"),
      targetId: bytes(1024),
      sends: z.union([z.literal(1), z.literal(2)]).optional(),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      expectedVersion: version,
      phase: z.literal("reconciling"),
      action: z.literal("inspect"),
      sends: z.union([z.literal(1), z.literal(2)]),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      expectedVersion: version,
      phase: z.literal("reconciling"),
      action: z.literal("resend"),
      sends: z.literal(1),
    })
    .strict(),
]);
export const driveSelectSchema = driveInitialSchema
  .extend({
    pickerId: z.uuid(),
    ticket: bytes(4096),
    fileId: bytes(1024),
    resourceKey: bytes(1024).nullable(),
  })
  .strict();

export function boundedDriveDto<T>(value: T): T {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 131072)
    throw new ConflictError(
      "DRIVE_UNAVAILABLE",
      "Driveの応答を表示できません。結果を確認してください。",
    );
  return value;
}
