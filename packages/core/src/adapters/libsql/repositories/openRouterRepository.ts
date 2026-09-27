import { ConflictError } from "@repo/core/application/errors";
import {
  OPENROUTER_RECEIPT_MS,
  type OpenRouterAttempt,
  type OpenRouterConnection,
  type OpenRouterModelSettings,
} from "@repo/core/domain/integration/openRouter";
import type {
  OpenRouterAttemptRepository,
  OpenRouterConnectionRepository,
  OpenRouterModelSettingsRepository,
} from "@repo/core/domain/integration/openRouterRepository";
import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  openRouterAttempts,
  openRouterConnections,
  openRouterModelSettings,
} from "../openRouterSchema";

const invalid = () =>
  new ConflictError(
    "OPENROUTER_STATE_INVALID",
    "連携状態を確認できませんでした。",
  );
const returnSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("settings") }),
  z.object({
    kind: z.literal("upload"),
    workspaceId: z.string().uuid().nullable(),
  }),
]);

function connection(
  row: typeof openRouterConnections.$inferSelect,
): OpenRouterConnection {
  if (row.state === "unlinked")
    return {
      ...row,
      state: "unlinked",
      credentialEnvelope: null,
      keyExpiresAt: null,
      providerUserId: null,
      linkedAt: null,
      lastUsedAt: null,
    };
  if (!row.credentialEnvelope || !row.linkedAt || !row.everLinkedAt)
    throw invalid();
  return {
    ...row,
    state: row.state,
    credentialEnvelope: row.credentialEnvelope,
    linkedAt: row.linkedAt,
  };
}

export class LibsqlOpenRouterConnectionRepository
  implements OpenRouterConnectionRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(accountId: string) {
    const [row] = await this.db
      .select()
      .from(openRouterConnections)
      .where(eq(openRouterConnections.accountId, accountId));
    return row ? connection(row) : null;
  }
  async ensure(accountId: string, now: Date) {
    await this.db
      .insert(openRouterConnections)
      .values({
        accountId,
        epoch: 0,
        version: 1,
        state: "unlinked",
        updatedAt: now,
      })
      .onConflictDoNothing();
    const value = await this.find(accountId);
    if (!value) throw invalid();
    return value;
  }
  async replace(value: OpenRouterConnection, expectedVersion: number) {
    if (value.version !== expectedVersion + 1) throw invalid();
    const rows = await this.db
      .update(openRouterConnections)
      .set(value)
      .where(
        and(
          eq(openRouterConnections.accountId, value.accountId),
          eq(openRouterConnections.version, expectedVersion),
        ),
      )
      .returning({ id: openRouterConnections.accountId });
    return rows.length === 1;
  }
}

function attempt(
  row: typeof openRouterAttempts.$inferSelect,
): OpenRouterAttempt {
  const common = {
    id: row.id,
    correlationHash: row.correlationHash,
    actor: {
      accountId: row.accountId,
      sessionHash: row.sessionHash,
      authVersion: row.authVersion,
    },
    browser: { hash: row.browserHash, epoch: row.browserEpoch },
    expectedEpoch: row.expectedEpoch,
    expectedVersion: row.expectedVersion,
    confirmedAdmissionSequence: row.confirmedAdmissionSequence,
    returnTo: returnSchema.parse(row.returnTo),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    version: row.version,
  };
  switch (row.state) {
    case "pending":
      if (!row.verifierEnvelope) throw invalid();
      return {
        ...common,
        state: "pending",
        verifierEnvelope: row.verifierEnvelope,
      };
    case "exchanging":
      return { ...common, state: "exchanging" };
    case "checking":
      if (!row.candidateEnvelope) throw invalid();
      return {
        ...common,
        state: "checking",
        candidateEnvelope: row.candidateEnvelope,
      };
    case "completed":
      if (row.resultEpoch === null || row.firstLink === null) throw invalid();
      return {
        ...common,
        state: "completed",
        resultEpoch: row.resultEpoch,
        firstLink: row.firstLink,
      };
    case "failed":
      if (row.failure === null) throw invalid();
      return { ...common, state: "failed", failure: row.failure };
  }
}
function encode(a: OpenRouterAttempt): typeof openRouterAttempts.$inferInsert {
  return {
    id: a.id,
    correlationHash: a.correlationHash,
    accountId: a.actor.accountId,
    sessionHash: a.actor.sessionHash,
    authVersion: a.actor.authVersion,
    browserHash: a.browser.hash,
    browserEpoch: a.browser.epoch,
    expectedEpoch: a.expectedEpoch,
    expectedVersion: a.expectedVersion,
    confirmedAdmissionSequence: a.confirmedAdmissionSequence,
    returnTo: a.returnTo,
    createdAt: a.createdAt,
    expiresAt: a.expiresAt,
    version: a.version,
    state: a.state,
    verifierEnvelope: a.state === "pending" ? a.verifierEnvelope : null,
    candidateEnvelope: a.state === "checking" ? a.candidateEnvelope : null,
    resultEpoch: a.state === "completed" ? a.resultEpoch : null,
    firstLink: a.state === "completed" ? a.firstLink : null,
    failure: a.state === "failed" ? a.failure : null,
  };
}
const active = ["pending", "exchanging", "checking"] as const;
export class LibsqlOpenRouterAttemptRepository
  implements OpenRouterAttemptRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(openRouterAttempts)
      .where(eq(openRouterAttempts.id, id));
    return row ? attempt(row) : null;
  }
  async findByCorrelation(hash: string) {
    const [row] = await this.db
      .select()
      .from(openRouterAttempts)
      .where(eq(openRouterAttempts.correlationHash, hash));
    return row ? attempt(row) : null;
  }
  async insert(value: OpenRouterAttempt & { state: "pending" }) {
    await this.db.insert(openRouterAttempts).values(encode(value));
  }
  async replace(value: OpenRouterAttempt, version: number) {
    if (value.version !== version + 1) throw invalid();
    const rows = await this.db
      .update(openRouterAttempts)
      .set(encode(value))
      .where(
        and(
          eq(openRouterAttempts.id, value.id),
          eq(openRouterAttempts.version, version),
        ),
      )
      .returning({ id: openRouterAttempts.id });
    return rows.length === 1;
  }
  async countRecent(hash: string, since: Date) {
    const [row] = await this.db
      .select({ n: count() })
      .from(openRouterAttempts)
      .where(
        and(
          eq(openRouterAttempts.browserHash, hash),
          gte(openRouterAttempts.createdAt, since),
        ),
      );
    return row?.n ?? 0;
  }
  async countActive(hash: string, now: Date) {
    const [row] = await this.db
      .select({ n: count() })
      .from(openRouterAttempts)
      .where(
        and(
          eq(openRouterAttempts.browserHash, hash),
          gt(openRouterAttempts.expiresAt, now),
          inArray(openRouterAttempts.state, active),
        ),
      );
    return row?.n ?? 0;
  }
  async fenceAccount(accountId: string, keepAttemptId: string | null) {
    await this.db
      .update(openRouterAttempts)
      .set({
        state: "failed",
        failure: "OPENROUTER_CONNECTION_CHANGED",
        verifierEnvelope: null,
        candidateEnvelope: null,
        version: sql`${openRouterAttempts.version} + 1`,
      })
      .where(
        and(
          eq(openRouterAttempts.accountId, accountId),
          inArray(openRouterAttempts.state, active),
          keepAttemptId === null
            ? undefined
            : ne(openRouterAttempts.id, keepAttemptId),
        ),
      );
  }
  async prune(now: Date, limit: number) {
    const receiptBefore = new Date(now.getTime() - OPENROUTER_RECEIPT_MS);
    const rows = await this.db
      .select()
      .from(openRouterAttempts)
      .where(
        or(
          and(
            inArray(openRouterAttempts.state, active),
            lte(openRouterAttempts.expiresAt, now),
          ),
          lte(openRouterAttempts.createdAt, receiptBefore),
        ),
      )
      .orderBy(openRouterAttempts.createdAt, openRouterAttempts.id)
      .limit(Math.max(0, Math.min(100, limit)));
    for (const row of rows) {
      if (row.createdAt <= receiptBefore)
        await this.db
          .delete(openRouterAttempts)
          .where(eq(openRouterAttempts.id, row.id));
      else
        await this.db
          .update(openRouterAttempts)
          .set({
            state: "failed",
            failure: "OPENROUTER_EXPIRED",
            verifierEnvelope: null,
            candidateEnvelope: null,
            version: row.version + 1,
          })
          .where(
            and(
              eq(openRouterAttempts.id, row.id),
              eq(openRouterAttempts.version, row.version),
            ),
          );
    }
    return rows.length;
  }
}

function models(
  row: typeof openRouterModelSettings.$inferSelect,
): OpenRouterModelSettings {
  if (row.defaultsVersion !== 1) throw invalid();
  return {
    accountId: row.accountId,
    version: row.version,
    defaultsVersion: 1,
    text: { kind: "chat-text", modelId: row.textModel },
    image: { kind: "chat-image", modelId: row.imageModel },
    audio: { kind: "stt-transcription", modelId: row.audioModel },
    updatedAt: row.updatedAt,
  };
}
function encodeModels(
  value: OpenRouterModelSettings,
): typeof openRouterModelSettings.$inferInsert {
  return {
    accountId: value.accountId,
    version: value.version,
    defaultsVersion: value.defaultsVersion,
    textModel: value.text.modelId,
    imageModel: value.image.modelId,
    audioModel: value.audio.modelId,
    updatedAt: value.updatedAt,
  };
}
export class LibsqlOpenRouterModelSettingsRepository
  implements OpenRouterModelSettingsRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(accountId: string) {
    const [row] = await this.db
      .select()
      .from(openRouterModelSettings)
      .where(eq(openRouterModelSettings.accountId, accountId));
    return row ? models(row) : null;
  }
  async insertDefaults(value: OpenRouterModelSettings) {
    await this.db
      .insert(openRouterModelSettings)
      .values(encodeModels(value))
      .onConflictDoNothing();
  }
  async replace(value: OpenRouterModelSettings, version: number) {
    if (value.version !== version + 1) throw invalid();
    const rows = await this.db
      .update(openRouterModelSettings)
      .set(encodeModels(value))
      .where(
        and(
          eq(openRouterModelSettings.accountId, value.accountId),
          eq(openRouterModelSettings.version, version),
        ),
      )
      .returning({ id: openRouterModelSettings.accountId });
    return rows.length === 1;
  }
}
