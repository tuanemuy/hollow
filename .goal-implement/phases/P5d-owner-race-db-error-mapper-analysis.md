# OWNER transaction rejection: mapper SOURCE analysis

Status: STATIC ONLY. The mapper boundary is established; the actual driver code and SQLite busy/lock cause remain UNKNOWN. The observed actualOpened=1 is not an accepted replacement for the required two opened handles.

## Direct immutable and working SOURCE binding

Controlled SOURCE: `/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006`.
Frozen HEAD: `516af3ba5e64f0ba1a7e3c9da697ca21d2b576f7`.
Exact path: `packages/core/src/adapters/libsql/repositories/helpers.ts`.

| Field | Direct result |
| --- | --- |
| Git mode | 100644 |
| Git blob | 24b6e57bb93b31cbb17643d07f322de363c6ddd7 |
| Bytes | 2375 |
| SHA256 | 939395a815129276880faa8a59a4ae2fe874278f4128a9c983d3be42e8a40974 |
| Working mode / UID / nlink | 0600 / 501 / 1 |
| Canonical / regular / nonlink | true / true / true |
| Immutable bytes equal working bytes | true |
| Stable metadata / actual file FD close | true / true |

The expected bytes and SHA were obtained from the pinned immutable Git blob before the working file body was read. The working file was opened O_NOFOLLOW and checked against that expectation; its dev, ino, mode, UID, nlink, size, mtime_ns and ctime_ns remained stable. The file body was read once within 64 KiB.

Pinned Git: `/nix/store/09lvdab6qif434wbjzz6wlcf6njp8m4h-git-2.51.2/bin/git`.
Five direct read-only commands covered HEAD-before, exact ls-tree, blob-size, blob-body and HEAD-after. Each owned child was registered with PID=PG, actually exited 0, reached known PG absence, produced actual stdout/stderr EOF, and had both parent pipe FDs actually closed. TERM/KILL was unused. Reads were bounded by a 10-second deadline, a 200 ms selector interval and 64 KiB per stream; stderr content was discarded. HEAD-before and HEAD-after matched the frozen commit.

## Translation and retry boundary

`findLibsqlError` (lines 12–21) traverses an Error cause chain with a cycle guard and requires the actual imported LibsqlError class. `findSqliteCode` (23–30) prefers a SQLITE-prefixed extendedCode, then a SQLITE-prefixed code. A name alone does not establish that class.

`mapDbError` (58–76) calls and awaits the supplied operation once. ApplicationError is rethrown unchanged. A recognized SQLITE_CONSTRAINT code is translated to ConflictError: UNIQUE/PRIMARYKEY map to UNIQUE_VIOLATION, FOREIGNKEY to FOREIGN_KEY_VIOLATION, and other constraint codes to CONSTRAINT_VIOLATION. The original error is retained as cause. Other or unrecognized errors become SystemError(DatabaseError), also retaining the original cause.

There is no retry, backoff or second invocation in this mapper. This conclusion is limited to the examined mapper and the previously examined serializedClient/UoW boundary; it does not establish the internal driver or provider retry policy. A hypothetical SQLITE_BUSY or SQLITE_LOCKED error is outside the mapper's constraint branch, but neither code was observed in the actual receipt.

`isOccGuardViolation` (37–43) is a separate helper. It requires LibsqlError and a constraint code, then checks the fixed OCC guard name. `mapDbError` does not call it. No actual error message was read in this investigation.

## Borrowed context and actual limits

The previous serializedClient analysis is fixed at 8941 bytes / SHA256 `1440eae371130f6cd4b62303c788e780e2e5da316cc90dbd0075c7d8fd403167`. Its directly examined transaction wrapper releases the queue and rethrows the original error when the underlying transaction call rejects before returning a handle. The previously examined HollowUnitOfWork catches the transaction boundary, preserves shared serializable/LLM errors, and otherwise delegates to this mapper.

The fixed OWNER actual classification is 9426 bytes / SHA256 `76978f704486bbd7e2a6f9310c78524a72da8549dc1315ba21cf56a347462fcb`. Its borrowed Root receipt reports requested=2, actualOpened=1, completed=2 and observerFault=false. The fixture counts a rejected transaction request as completed; completed is not a successful transaction or native closure count. These fields support the previously stated reject-before-handle branch inference. They do not identify a driver attempt, native code, synchronous versus asynchronous driver failure, winner, refusal, final SQL state or SQLite lock cause.

The case AssertionError/nativeCode=none is not the rejected driver's code. The mapper retaining a cause does not make that cause available in the fixed safe receipt. No private receipt, buffer, database, message, stack or SQL was recovered.

## Next exact read proposal

Before examining a driver entry, establish the frozen P5d formal PUBLIC108/83 binding for `@libsql/client/package.json`: exact canonical target, version, bytes and SHA. Then adopt that one metadata file with a 32 KiB cap and derive the applicable Node/file entry from its formal exports. Adopt the resulting exact body and its literal edges separately; no guessed driver filenames or general package walk are needed.

The normal-fixture context previously knew the lexical metadata path `/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@libsql+client@0.18.0/node_modules/@libsql/client/package.json`. That lexical path is a proposal reference only: the current P5d canonical binding has not been directly established by this task. No external metadata or driver body was read here. Imported application error and schema bodies were not additionally read.

## STOP receipt

No source/helper/product edit, diagnostic implementation, expectation weakening, runtime/default/preflight/test/import, Node/native/DB operation, network operation, root probe/create/reservation or private-root operation occurred. Existing actual and generated roots remain permanent NOOPS. This report alone is the new wx0600 output. All SOURCE, helper and external readers and all writers/runtime are STOP after fixation. Further exact read or implementation requires Manager adoption.

Fixed at 2026-10-06T14:58:44.693510+00:00
