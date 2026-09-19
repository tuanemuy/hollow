import { BusinessRuleError } from "@repo/core/domain/error";
import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode } from "../errors";
import type { ExportFormat } from "./document";
import type { ExportOperation } from "./ports";
import {
  type ExportAccess,
  exportNotFound,
  inspectExportSources,
  readExportSnapshot,
} from "./snapshot";
import { exportStream } from "./stream";

const changed = () =>
  new BusinessRuleError(
    "EXPORT_CHANGED",
    "内容が更新されました。最新の内容を確認して書き出しをやり直してください。",
  );
export function exportServices(c: HollowContainer) {
  const storage = c.importing?.storage;
  const withOwner = storage?.withOwner;
  const removeClaimed = storage?.removeClaimed;
  if (!c.exporting || !storage || !withOwner || !removeClaimed)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "書き出しを利用できません。",
    );
  return {
    ...c.exporting,
    storage,
    withOwner: withOwner.bind(storage),
    removeClaimed: removeClaimed.bind(storage),
  };
}
function sameAuthority(
  a: ExportOperation["authority"],
  b: ExportOperation["authority"],
) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function prepareExport(
  c: HollowContainer,
  access: ExportAccess,
  format: ExportFormat,
  requestSignal?: AbortSignal,
) {
  const service = exportServices(c);
  const id = c.idGenerator.next();
  const acceptedAt = c.clock.now();
  const initial = await c.unitOfWorkProvider.run((u) =>
    readExportSnapshot(c, u, access),
  );
  if (initial.authority.kind !== "account") {
    const authority = initial.authority;
    const retry = await c.unitOfWorkProvider.run(async (u) => {
      return u.exports.reserveDownload(
        initial.note.id,
        authority.browserHash,
        c.clock.now(),
      );
    });
    if (retry)
      throw new BusinessRuleError(
        "EXPORT_RATE_LIMIT",
        "書き出し回数の上限に達しました。1分後にやり直してください。",
      );
  }
  const now = acceptedAt;
  const operation: ExportOperation = {
    id,
    noteId: initial.note.id,
    authority: initial.authority,
    format,
    sourceIdentity: initial.identity,
    key: `export-${id}`,
    reservedBytes: 0,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 120000),
    generation: 1,
    nextCleanupAt: now,
    cleanupToken: null,
    cleanupUntil: null,
    state: "preparing",
    file: null,
  };
  await c.unitOfWorkProvider.run((u) =>
    u.exports.begin(operation, service.diskLimit),
  );
  let accepted = false;
  try {
    service.lifetime.start(
      id,
      operation.expiresAt.getTime() - c.clock.now().getTime(),
    );
    return await service.lifetime.generation(id, async (operationSignal) => {
      const signal = requestSignal
        ? AbortSignal.any([operationSignal, requestSignal])
        : operationSignal;
      const inspected = await inspectExportSources(c, initial, signal);
      const externalIdentity = c.tokens.hash(
        JSON.stringify(inspected.external),
      );
      const plan = await service.writer.plan(
        {
          noteId: initial.note.id,
          title: initial.note.title,
          html: initial.note.html,
          style: initial.note.display.style,
          defaultCss: service.defaultCss,
          appUrl: c.appUrl,
          format,
          media: inspected.media,
          external: inspected.external,
        },
        signal,
      );
      await c.unitOfWorkProvider.run((u) =>
        u.exports.reserve(id, plan.maxBytes, service.diskLimit),
      );
      const file = await service.withOwner(
        { kind: "export-operation", id },
        () =>
          service.storage.putBounded(
            operation.key,
            exportStream(plan, inspected.sources, service.sources, signal),
            plan.maxBytes,
            signal,
          ),
      );
      const latest = await c.unitOfWorkProvider.run((u) =>
        readExportSnapshot(c, u, access),
      );
      if (latest.identity !== initial.identity) throw changed();
      const rechecked = await inspectExportSources(c, latest, signal);
      if (
        c.tokens.hash(JSON.stringify(rechecked.external)) !== externalIdentity
      )
        throw changed();
      await c.unitOfWorkProvider.run(async (u) => {
        const current = await readExportSnapshot(c, u, access);
        if (!sameAuthority(operation.authority, current.authority))
          return exportNotFound();
        if (signal.aborted || current.identity !== initial.identity)
          throw changed();
        if (
          !(await u.exports.ready(
            id,
            {
              ...file,
              filename: plan.filename,
              mime: plan.mime,
              externalIdentity,
            },
            c.clock.now(),
          ))
        )
          throw changed();
      });
      accepted = true;
      return {
        operationId: id,
        noteId: initial.note.id,
        actorId:
          initial.authority.kind === "account"
            ? initial.authority.accountId
            : null,
        filename: plan.filename,
        bytes: file.bytes,
        expiresAt: operation.expiresAt.toISOString(),
        notices: plan.notices,
      };
    });
  } finally {
    if (!accepted) {
      await c.unitOfWorkProvider.run((u) =>
        u.exports.retire(id, c.clock.now()),
      );
      service.lifetime.release(id);
      service.wake();
    }
  }
}

async function ownedOperation(
  c: HollowContainer,
  access: ExportAccess,
  id: string,
  checkIdentity = true,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const current = await readExportSnapshot(c, u, access);
    const operation = await u.exports.find(id);
    if (
      !operation ||
      operation.noteId !== current.note.id ||
      !sameAuthority(operation.authority, current.authority) ||
      operation.expiresAt <= c.clock.now()
    )
      return exportNotFound();
    if (checkIdentity && current.identity !== operation.sourceIdentity)
      throw changed();
    return { current, operation };
  });
}
export async function cancelExport(
  c: HollowContainer,
  access: ExportAccess,
  id: string,
) {
  const { operation } = await ownedOperation(c, access, id, false);
  const service = exportServices(c);
  service.lifetime.cancel(id);
  await c.unitOfWorkProvider.run((u) =>
    u.exports.retire(operation.id, c.clock.now()),
  );
  service.wake();
}
export async function getExportFile(
  c: HollowContainer,
  access: ExportAccess,
  id: string,
) {
  const service = exportServices(c);
  const { current, operation } = await ownedOperation(c, access, id);
  if (operation.state !== "ready") return exportNotFound();
  await c.unitOfWorkProvider.run(async (u) => {
    const latest = await readExportSnapshot(c, u, access);
    if (!sameAuthority(operation.authority, latest.authority))
      return exportNotFound();
    if (latest.identity !== operation.sourceIdentity) throw changed();
    if (!(await u.exports.claimSend(id, c.clock.now())))
      return exportNotFound();
  });
  return new Promise<{
    body: ReadableStream<Uint8Array>;
    file: NonNullable<ExportOperation["file"]>;
  }>((resolve, reject) => {
    void service.lifetime
      .delivery(id, async (signal) => {
        try {
          await service.withOwner(
            { kind: "export-operation", id },
            async () => {
              const inspectionSignal = AbortSignal.any([
                signal,
                AbortSignal.timeout(30000),
              ]);
              const inspected = await inspectExportSources(
                c,
                current,
                inspectionSignal,
              );
              if (
                inspectionSignal.aborted ||
                c.tokens.hash(JSON.stringify(inspected.external)) !==
                  operation.file.externalIdentity
              )
                throw changed();
              const source = (
                await service.storage.stream(operation.key)
              ).getReader();
              let closed = false;
              let done!: () => void;
              const completion = new Promise<void>((r) => {
                done = r;
              });
              const close = async () => {
                if (closed) return;
                closed = true;
                try {
                  await source.cancel();
                } finally {
                  done();
                }
              };
              const abort = () => {
                void close();
              };
              signal.addEventListener("abort", abort, { once: true });
              const body = new ReadableStream<Uint8Array>(
                {
                  async pull(controller) {
                    try {
                      if (signal.aborted) throw changed();
                      const next = await source.read();
                      if (next.done) {
                        await close();
                        controller.close();
                      } else controller.enqueue(next.value);
                    } catch (error) {
                      await close();
                      controller.error(error);
                    }
                  },
                  async cancel() {
                    await close();
                  },
                },
                { highWaterMark: 1 },
              );
              try {
                await c.unitOfWorkProvider.run(async (u) => {
                  const latest = await readExportSnapshot(c, u, access);
                  if (!sameAuthority(operation.authority, latest.authority))
                    return exportNotFound();
                  if (
                    signal.aborted ||
                    latest.identity !== operation.sourceIdentity
                  )
                    throw changed();
                });
                resolve({ body, file: operation.file });
                await completion;
              } finally {
                signal.removeEventListener("abort", abort);
                await close();
              }
            },
          );
        } finally {
          await c.unitOfWorkProvider.run((u) =>
            u.exports.retire(id, c.clock.now()),
          );
          service.wake();
        }
      })
      .catch(reject)
      .finally(() => service.lifetime.release(id));
  });
}

export async function sweepExports(c: HollowContainer) {
  const service = exportServices(c);
  for (let i = 0; i < 20; i++) {
    const now = c.clock.now();
    const token = c.idGenerator.next();
    const operation = await c.unitOfWorkProvider.run((u) =>
      u.exports.claimCleanup(now, token, new Date(now.getTime() + 60000)),
    );
    if (!operation) return;
    service.lifetime.cancel(operation.id);
    service.lifetime.release(operation.id);
    try {
      const removed = await service.removeClaimed(operation.key);
      if (
        await c.unitOfWorkProvider.run((u) =>
          u.exports.finishCleanup(operation.id, token, removed.token),
        )
      )
        service.lifetime.release(operation.id);
    } catch {
      await c.unitOfWorkProvider.run((u) =>
        u.exports.deferCleanup(operation.id, token, c.clock.now()),
      );
    }
  }
}
