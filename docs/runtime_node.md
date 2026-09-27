# Runtime: Node.js + libSQL (standalone)

Single-process runtime backed by an embedded libSQL file. No Docker, no Cloudflare account required. The full Outbox / domain-event lifecycle (relay → consumer → pruner) runs inside the same process as the HTTP server.

This is the default runtime: `pnpm dev` / `pnpm build` / `pnpm start` all alias to the `:node` variants. See [`runtime_cloudflare.md`](./runtime_cloudflare.md) for the Workers runtime.

## Limited sharing keys

Limited sharing uses a dedicated local key ring, separate from invitation keys. Set `HOLLOW_SHARE_KEY_DIR` to an absolute, canonical directory owned by the runtime user (mode 0700). Set `HOLLOW_SHARE_ACTIVE_KEY_ID` to the writing key ID and `HOLLOW_SHARE_KEY_IDS` to the comma-separated active and retained decryption IDs. Each `<key-id>.key` is a raw 32-byte file owned by that user with mode 0600. Symlinks, wrong ownership/modes and malformed keys fail closed. A missing key blocks link creation, copy and reissue, but existing hash-based reads, password checks and private revocation remain available. Correcting the configuration and restarting restores access to retained encrypted links.

From `apps/web`, with the directory variable set, run `pnpm exec tsx scripts/sharing-keys.node.ts create first` to generate a new key without printing it. The parent directory must already exist. Creation refuses to overwrite a key. Do not put key bytes, tokens, passwords, cookie values or token URLs into logs, screenshots or command arguments.

For rotation, back up the database and all retained keys securely, create a new key ID, include both old and new IDs in `HOLLOW_SHARE_KEY_IDS`, and select the new active ID. Stop and drain the app before maintenance. With the same database environment as the app, run `pnpm exec tsx scripts/sharing-keys.node.ts rotate`; each invocation scans at most 50 note IDs and prints only its rewrite count and next cursor. Pass that cursor as the next argument until it is null. Resume the app with the updated ring. Rotation re-encrypts envelopes only: copied URLs, grants, note revisions and sharing versions remain unchanged. Reads never rotate implicitly. Retain old keys until neither current rows nor any retained database backup needs them; this command never removes keys.

Password work is bounded to two active hashes, eight queued requests and a three-second queue deadline. Overflow returns retryable 503. A link admits at most 60 password checks per fixed 15-minute window; this can temporarily delay legitimate new readers under attack. A browser's eighth consecutive failure blocks it for a fixed 15 minutes, with shorter waits after failures 3–7. Blocked requests do not extend either deadline. Existing valid 24-hour grants remain readable. The runtime prunes at most 100 expired grants and 100 stale rate rows per one-minute sweep and drains hashing/pruning before closing the database.

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [The libSQL data file](#the-libsql-data-file)
- [SQLite PRAGMAs applied at boot](#sqlite-pragmas-applied-at-boot)
- [Worker runner (relay / consumer / pruner)](#worker-runner-relay--consumer--pruner)
- [Migrations](#migrations)
- [Graceful shutdown](#graceful-shutdown)
- [Single-process operational constraints](#single-process-operational-constraints)
- [Logging and observability](#logging-and-observability)
- [Known limitations](#known-limitations)
- [HTML and Markdown ZIP jobs](#html-and-markdown-zip-jobs)

## HTML and Markdown ZIP jobs

ZIP jobs require the Node single-process runtime and the `0030_zip_html_markdown` migration. Stop and drain the runtime before migrating; preserve the database, every SQLite sidecar, and the object directory together. The runtime must retain its exclusive object-storage lock through all reads, writes, worker exits and shutdown. Do not share the same database/object directory between live processes.

Set `HOLLOW_ZIP_CONFIG` to a local JSON file with this initial reference configuration:

```json
{
  "version": 1,
  "capacity": {
    "diskBytes": 4294967296,
    "protectedDiskBytes": 6442450944,
    "totalMs": 1800000,
    "childMs": 120000,
    "assemblyMs": 120000,
    "deliveryMs": 600000,
    "leaseMs": 60000,
    "cleanupMs": 30000
  }
}
```

The file must be a regular non-symlink file of at most 16 KiB. Unknown fields, unsafe/non-positive integers and timers above 2,147,483,647 ms are rejected with a non-secret configuration error. `protectedDiskBytes` must be at least 6 GiB and at least the configured single-export and PDF pools combined. HTML/Markdown ZIP does not require PDF, Python, Chrome, PDF fonts or PDF keys. The build includes its dedicated document planner at `dist/server/export/document.mjs`; rebuild before starting the runtime, never over a live runtime.

ZIP uses a separate 4 GiB reservation pool, one global active run (also one per account), and two global nonclosed deliveries, including prepared deliveries. There is no waiting queue. The admission mutex takes a fresh reservation snapshot and `statfs` sample before the transaction rechecks the current reservation total. Available disk must cover the entire protected existing pool, ZIP reservations not yet materialized, and the proposed write. A configuration sum of 10 GiB is not a volume-size guarantee or an OS disk quota: existing objects, the database, retained ZIPs, backups and unrelated processes also occupy space. A physical quota/container budget is an operator concern; this admission check does not claim a hard OS guarantee.

The 1 GB business limit is exactly 1,000,000,000 bytes of generated entry content plus `hollow-export-report.txt`, before STORE headers. It is not the reservation ceiling. Technical capacity/close failures do not prove business-size overflow. At most 500 fixed targets are accepted; preview/details pages contain at most 50 rows. Names are flat NFC names capped at 200 UTF-8 bytes and allocated against Unicode 16 width/case-fold collision keys, original suffix candidates and the reserved report name. ZIP uses public `ZipArchive` from pinned `archiver@8.0.0`, STORE, sequential sources and 64 KiB streaming chunks. See the [dependency notice](zip-dependencies.md).

The dedicated pump wakes every two seconds without overlapping itself; each sweep processes at most 20 cleanup objects, and each prune statement touches at most 100 rows. A run has a 30-minute admission deadline, each child 120 seconds (document planning 30 seconds), assembly 120 seconds and cleanup 30 seconds. Stage cancellation still waits for real resource closure; these are acceptance deadlines, not OS termination guarantees. Workers use a separate 128 MiB old-generation / 16 MiB young-generation / 4 MiB stack budget. Native buffers and process RSS are not fully bounded by these V8 settings.

Artifacts expire seven days after publication. Each prepared delivery expires after ten minutes, clamped to the artifact expiry; re-preparing does not extend retention. Every download checks the current account and every included note's current internal read/content identity. Public/link access is not a fallback. A partial ZIP can retry only its latest failed children after fresh confirmation while retained successful spools remain valid. An assembly-only failure creates a new parent referencing existing successful spools. Original run/attempt history expires after its own 90 days; a new attempt/run has its own 90 days. Reused titles/details are not copied into a new retention period. Each terminal run has its own immutable finish time.

Native file close, worker exit and `withOwner` completion precede publication and reservation release. `finalize`, `finish`, cancellation initiation or lease expiry are not close evidence. If closure is unproven, keep the persistent owner, stopping run, reservations and cleanup debt. Shutdown rejects and must not report normal completion or release the runtime lock/database through a success path. Restart recovery is allowed only after the previous process and its executions have actually ended: exclusive runtime ownership and common `recoverOwners` precede ZIP recovery. Never clear owner rows manually to bypass this fence.

With ZIP configuration absent, resources, retry references, active owners or cleanup debt cause an explicit boot refusal; restore the configuration for normal recovery/cleanup. Resource-free historical shells alone do not block boot. Stop, preserve all sidecars/objects, diagnose ownership, then restart with the same valid configuration. No source session or cookie is stored in ZIP work. Cancelled jobs do not become retry failures; their original notes remain unchanged.

## Quick start

Node 22.13 or newer is required. The Node deployment includes `packages/core`, its installed production dependencies, and the `src/adapters/node/import/*.mjs` workers; copying only `apps/web/dist` is insufficient. Sharp's platform-specific optional packages must be installed for the deployment OS/architecture.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm db:generate           # generate SQL from the Drizzle schema
pnpm db:migrate            # creates apps/web/data/ and applies migrations
pnpm dev                   # http://localhost:3000
```

For a production build:

```bash
pnpm build                 # vite build with the Node target (vite.config.node.ts)
pnpm start                 # tsx apps/web/scripts/listen.node.ts — boots @hono/node-server
```

The flow:

1. `vite build --config vite.config.node.ts` writes a fetch-handler bundle to `apps/web/dist/server/server.node.js`.
2. `apps/web/scripts/listen.node.ts` dynamically imports the bundle, calls its `boot()` to construct the libSQL client + DI container + worker runner, then registers the handler with `@hono/node-server`.
3. SIGTERM / SIGINT triggers the shutdown sequence described below.

## Environment variables

The launchers and the migrator read `process.env` only — env injection happens at the invocation, uniformly across runtimes. The `start:node` / `start:node:prod` / `db:migrate:node` scripts pass `--env-file-if-exists=.env` (resolved against `apps/web`, the scripts' cwd), so copy `apps/web/.env.example` to `apps/web/.env` and edit it; variables already present in the environment win over the file. The schema is validated at boot in `packages/core/src/application/di/serverNode.ts`.

For `pnpm dev` the vite dev server does not load `.env` files into `process.env`; export the variables in your shell (e.g. via direnv — see `.envrc.example`).

| Variable                  | Required | Default                  | Purpose                                                                                              |
| ------------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | yes      | `file:./data/app.db`     | libSQL URL. `file:` opens an embedded SQLite file; `:memory:` is ephemeral; `libsql://` is remote.   |
| `APP_URL`                 | yes      | `http://localhost:3000`  | Public origin used to build absolute URLs (canonical / OG image / OAuth callbacks).                  |
| `PORT`                    | no       | `3000`                   | HTTP listener port.                                                                                  |
| `HOSTNAME`                | no       | `0.0.0.0`                | HTTP listener bind address.                                                                          |
| `DATABASE_AUTH_TOKEN`     | no       | (unset)                  | Bearer token for remote libSQL / Turso. Leave unset for local files.                                 |
| `DATABASE_ENCRYPTION_KEY` | no       | (unset)                  | Encryption key for encrypted libSQL databases. Leave unset for plaintext.                            |
| `HOLLOW_STORAGE_DIR` | no | `data/originals` (relative to `apps/web`) | Private original-file directory. Keep outside `dist/client` and back it up with the DB. |
| `OUTBOX_BATCH_SIZE`       | no       | `25`                     | Max outbox rows claimed per relay tick.                                                              |
| `OUTBOX_LEASE_MS`         | no       | `30000`                  | Lease window (ms) before a stuck claim becomes reclaimable.                                          |
| `OUTBOX_MAX_ATTEMPTS`     | no       | `3`                      | Per-event max attempts before quarantine (`failed_at` stamp).                                        |
| `OUTBOX_RETENTION_MS`     | no       | `604800000` (7 days)     | Retention window before processed outbox rows are pruned.                                            |

The outbox tuning variables are shared with the Cloudflare runtime; the schema is declared once in `packages/core/src/application/di/env.ts` and consumed by both `serverNode.ts` and the wrangler `[vars]` readers.

## The libSQL data file

### Trash and permanent deletion

Moving a note to trash retains its content, 20 retained revisions, originals and media. Restoration closes at the server's 30-day deadline. Permanent deletion is an irreversible persisted intent: normal note, original and media access closes immediately; physical recovery remains pending until each owned object is removed. Failed removal retains capacity and can be retried. Shared companions remain until their last note relationship and pending batch acceptance have ended. Ordinary unreferenced-media collection still uses its seven-day grace period; permanent deletion does not add that grace period.

The purge runner starts at boot and polls every two seconds, preparing at most 20 expired notes and processing one intent with up to 100 object keys per pass. Its 60-second database lease fences result commits, not filesystem writer liveness. Failed intents retry after 30 seconds; waiting writers are revisited after two seconds. These are operational batch limits, not completion-time guarantees. Terminal import/reference jobs become owner-only minimal result snapshots with the original IDs and timestamps; the 90-day history lifetime is not extended by deletion.

Use exactly one Node process and one database for a storage root. `.hollow-writer-owner` records that process's ownership, and `.hollow-writer-owner.recovery` serializes startup recovery. DI instances in the same process share write lifetimes and per-key exclusion. Every upload/conversion/reference attempt holds ownership through its final database publication and cleanup. All permanent deletion, media GC and import/reference cleanup share durable per-key deletion claims. Cancellation, lease expiry and an initial missing file do not establish that a writer has stopped.

Restart after the previous process has drained and exited. A new process recovers old attempts only after the recorded process is confirmed absent. A live or reused PID, unreadable/invalid owner record, or interrupted recovery lock blocks startup safely; do not force takeover while liveness is uncertain. An operator must establish that no writer can still access that exact database/storage pair before repairing an abandoned ownership record. The application never kills the recorded process or treats this refusal as deletion completion. This is a local single-process contract, not distributed filesystem locking or multi-host failover.

### File imports

HTML, Markdown, UTF-8/UTF-16 text, DOCX, XLSX, PPTX, PDF, images and audio are accepted in the personal/private scope. Old DOC/XLS/PPT and ordinary ZIP archives are unsupported. Office/PDF use machine text extraction, not layout reproduction. Extraction notices remain with the original after the 90-day job history expires. Image/audio and PDFs without extractable text retain the original as `needs_ai`; selecting no LLM records a failure with instructions to import again with AI enabled. No AI provider is connected in this phase.

Uploads reserve capacity transactionally (100 files, 500 MiB per batch, 50 MiB per file or 200 MiB audio, 5 GiB per account). Originals stream to mode-0600 files beneath a mode-0700 directory, using generated keys rather than filenames. Each stream has a five-minute deadline. Reservations expire after one hour; unaccepted files are collected after the upload deadline grace period. Cleanup is persisted and replayed until deletion is acknowledged. Accepted originals are never deleted by history pruning. Download requests always recheck the owner and force an attachment; the storage directory is not a static-asset directory.

The conversion runner starts at boot, sweeps every two seconds, and runs two jobs concurrently. A job owns a 90-second lease, renewed every 30 seconds. Startup and periodic sweeps recover queued/expired jobs independently of outbox delivery. Result commits require the current lease, job, note version, owner and verified account. A fourth claim attempt or a 30-minute age produces a retryable timeout. Cancel stops queued children; running children finish. A retry creates a distinct job and cannot overwrite a manually edited note.

The local libSQL client serializes standalone statements, batches and complete interactive transaction lifetimes on the same resource. This includes outbox and idempotency writes as well as Hollow requests and conversion jobs. A failed commit retains the resource until rollback or close. Business callbacks are not retried. Remote libSQL clients keep the driver's normal concurrency behavior.

Parsers run in worker threads with a 30-second deadline, a 256 MiB V8 old-generation ceiling, bounded ZIP entries/actual expansion/XML depth, and disabled network calls. This is not an OS process/RSS sandbox: deploy the Node process under an OS/container memory limit for a hard total-memory ceiling. Buffer allocations are additionally bounded by file, ZIP and output limits. Fixture writers are test preparation tools, not production dependencies.

Images and audio are validated before a job can become `needs_ai`. Image validation uses Sharp's pixel decoder for PNG/JPEG/GIF/WebP, including animated frames (40 million pixels, 1,000 frames, 160 MB decoded-output ceiling). Audio validation combines music-metadata with RIFF chunk bounds, FLAC frame/header checksums and sample counts, Ogg checksums/page sequences/end markers, MPEG audio frame boundaries, and MP4 sample/chunk offsets within media data. This detects missing payload, structural corruption and truncation; it does not promise every audio codec's complete playback or bit-perfect decoding. Compact MP4 sample tables (`stz2`), fragmented MP4 and free-format MPEG audio are reported as unsupported audio structures, distinct from corruption and never as successful imports. Compact table bounds are checked before reporting the unsupported result; music-metadata currently cannot parse these tables.

Media inputs stream to a private temporary directory for random-access inspection; audio up to 200 MiB does not pass through the document worker's 50 MiB buffer limit. Validation and staging share a 30-second deadline and the document/media admission pool (two active, eight waiting). Temporary files are removed after success, failure or timeout. A killed Node process may leave temporary directories under the OS temp root; operational temp cleanup must account for crashed processes. Sharp uses native allocations outside the V8 heap ceiling. Production validation does not invoke system FFmpeg; FFmpeg is used only to generate committed synthetic test fixtures.

`DATABASE_URL=file:./data/app.db` is resolved from the `@repo/web` workspace directory, so the default produces three files under `apps/web/data/`:

```
apps/web/data/
├─ app.db        # main database file
├─ app.db-wal    # write-ahead log (created when PRAGMA journal_mode = WAL is on)
└─ app.db-shm    # shared memory file used by WAL
```

`apps/web/data/` is gitignored, and `apps/web/scripts/migrate.node.ts` + `apps/web/app/server.node.ts` both create the parent directory at boot — libSQL's embedded driver does not create it automatically.

### Backup

The database is plain SQLite. Two options:

- **Cold copy** while the process is stopped:

  ```bash
  # Stop the process and wait for graceful shutdown, then:
  cp apps/web/data/app.db apps/web/data/backup-$(date +%Y%m%d).db
  ```

- **Online backup** while the process is running, via the SQLite CLI's `.backup` command:

  ```bash
  sqlite3 apps/web/data/app.db ".backup apps/web/data/backup-$(date +%Y%m%d).db"
  ```

  `.backup` is concurrency-safe under WAL — readers and writers continue uninterrupted.

The `*-wal` / `*-shm` sidecar files do **not** need to be copied; SQLite reconstructs them from the main file on next open. Restore by stopping the process, replacing `apps/web/data/app.db` with the backup, and starting again.

## SQLite PRAGMAs applied at boot

`packages/core/src/adapters/libsql/client.ts#applyPragmas` runs three statements after the client is constructed (unless `wal: false` is passed for `:memory:` / read-only test databases):

| PRAGMA                  | Why                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journal_mode = WAL`    | Readers do not block the single writer. Matches the throughput model the deferred-batch UoW assumes.                                                                                                      |
| `foreign_keys = ON`     | SQLite ships with FK enforcement off; D1 has it on by default. Without this PRAGMA the libSQL adapter would silently diverge for any future FK relation.                                                  |
| `busy_timeout = 5000`   | Gives a 5-second wait before a contended write surfaces as `SQLITE_BUSY`. The UoW does not retry on `SQLITE_BUSY`, so this buffer is the only protection against transient contention from cron sweeps.   |

## Worker runner (relay / consumer / pruner)

`apps/web/app/worker/node/runner.ts#createNodeWorkerRunner` is the same-process orchestrator for the four roles that ship as separate Workers on Cloudflare.

| Role     | Cloudflare                              | Node                                                                                                              |
| -------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Relay    | 5-minute cron + `RELAY` Service Binding | 60-second `setInterval` fallback + `InProcessRelayTrigger.kick()` from the request-path UoW (`setImmediate` fan)  |
| Consumer | Queue subscriber                        | `InMemoryQueueDispatcher` — relay hands a decoded batch to the dispatcher, which invokes the consumer handler     |
| Pruner   | Daily cron                              | 24-hour `setInterval`                                                                                             |
| DLQ      | Dedicated Worker over `events-dlq`      | `processOutboxEvents` already logs `[outbox] quarantining event …` when `failed_at` is stamped — no separate sweep |

`runner.start()`:

- Fires an immediate relay tick so a freshly-started process drains any backlog from a previous crash without waiting a full interval.
- Registers the two intervals and `process.on("SIGTERM" | "SIGINT", …)` handlers.
- Returns synchronously; the timers `unref` so short-lived scripts and tests can exit naturally.

Concurrent kicks are collapsed: the periodic fallback and request-path kicks share one in-flight slot, so the same outbox row is never claimed twice in the same tick. Lease semantics still apply across process restarts — a crashed worker's claim is reclaimable once `OUTBOX_LEASE_MS` lapses.

### Consumer handler

`consumerHandler` is a required dependency on `createNodeWorkerRunner` so wiring is explicit at the type level. `apps/web/app/server.node.ts` passes an inline `async () => {}` as the template default — replace it with your application-specific subscriber. Idempotency is enforced by the dispatcher before the handler runs, so handlers stay idempotent without per-handler bookkeeping.

## Migrations

The canonical schema lives at `packages/core/src/adapters/d1/schema.ts`; `packages/core/src/adapters/libsql/schema.ts` re-exports it so both runtimes share an identical type-level surface.

```bash
pnpm db:generate           # alias of db:generate:node
pnpm db:generate:node      # drizzle-kit generate → packages/core/src/adapters/libsql/migrations/
pnpm db:generate:cf        # drizzle-kit generate → packages/core/src/adapters/d1/migrations/ (mirror)
pnpm db:migrate            # alias of db:migrate:node
pnpm db:migrate:node       # tsx apps/web/scripts/migrate.node.ts — applies libSQL migrations
```

Workflow:

1. Edit `packages/core/src/adapters/d1/schema.ts`.
2. `pnpm db:generate:cf` to author the SQL (this is the source of truth).
3. `pnpm db:generate:node` to mirror it under `packages/core/src/adapters/libsql/migrations/`.
4. `pnpm db:migrate` to apply against the local libSQL file.

Drizzle's programmatic migrator writes its bookkeeping into the `__drizzle_migrations` table inside the database, so re-running `pnpm db:migrate` is idempotent.

## Graceful shutdown

`apps/web/scripts/listen.node.ts` and `apps/web/app/server.node.ts` both register SIGTERM / SIGINT handlers. The shutdown sequence:

1. `@hono/node-server` stops accepting new HTTP connections.
2. The import, reference and purge runners stop accepting work and drain their active work. The embedded outbox runner has `manageSignals: false`; the server owns this order.
3. `runner.stop()`:
   1. Clears the relay / prune `setInterval`s and removes signal handlers.
   2. `relayTrigger.stop()` rejects further `kick()` calls.
   3. Awaits all tracked in-flight relay / prune ticks via the `pendingSweeps` set.
   4. Calls the cleanup hook supplied at construction time, which `client.close()`s the libSQL handle.
4. `process.exit(0)`.

The shutdown promise is memoised — calling `stop()` repeatedly (e.g. from a signal handler and again from a test teardown) is safe.

The direct `@libsql/client` dependency is pinned to 0.18.0. Its public connection pool reuses embedded transaction connections; the application retains its per-client resource queue and public transaction/close API. `close()` ends client use, but native prepared-statement handles may remain until garbage collection. No forced garbage collection is part of application operation. Turso remote connections remain untested.

### `*.db-wal` / `*.db-shm` after shutdown

These sidecar files may remain on disk even after a clean shutdown; SQLite reclaims them lazily and reuses them on next open. This is normal — do not delete them while the process is running.

## Single-process operational constraints

The Node runtime is **single-writer, single-process**. libSQL's embedded driver does not coordinate across OS processes (multiple processes opening the same `file:` URL race against each other on the WAL), and the worker runner assumes one in-flight relay loop at a time.

Implications:

- Run exactly one instance of `pnpm start` against a given `apps/web/data/app.db` path.
- Horizontal scaling (multiple Node processes behind a load balancer sharing one DB file) is **not supported** in this template. Promote to the Cloudflare runtime, or front the libSQL data with a Turso remote URL (see *Known limitations* below).
- Vertical scaling (a single beefier machine) works fine — WAL allows many concurrent readers against the single writer.

## Logging and observability

The application uses the `ConsoleLogger` port (`packages/core/src/application/ports/logger.ts`) — every log line is `console.log` / `console.error` formatted as JSON-ish objects. On Cloudflare this is picked up by `wrangler tail` / Logpush; on Node the lines go straight to stdout / stderr and can be piped into any aggregator (journald, vector, etc).

Structured logging via `pino` or similar is a deliberate non-goal of the current template (the Cloudflare runtime constrains the choices). It is on the open-issues list in `plan.md`.

## Local workspace invitation delivery

Set `HOLLOW_MAIL_MODE=local`, `HOLLOW_MAILBOX_DIR` and `HOLLOW_INVITATION_KEY_FILE`. The key file contains exactly 32 random bytes, is owned by the runtime user with mode `0600`, and lives in a private `0700` directory outside the repository, database, object storage, mailbox and static files. Generate it once with exclusive creation; never overwrite an existing key. Only its path belongs in environment configuration. Do not log, copy into a fixture, or commit key bytes.

The Node adapter uses AES-256-GCM with a fresh nonce and authenticated purpose, invitation ID and generation. Keep the same key across normal restarts. Back up the key separately and securely: a database backup alone cannot recover invitation envelopes. Missing, unreadable or incorrect keys fail closed for secret-dependent invitation operations; ordinary authentication and invitation cancellation remain available. Restore the configuration and restart normally to recover. Key rotation, hot reload and managed KMS are not provided.

The local mailbox adapter creates one file for each delivery ID and rejects a different payload for the same ID. Recipient, subject and token-adjacent body parts are frozen at issuance; only the protected token is inserted for delivery. Internal retries do not re-charge invitation rate limits. Delivery attempts are bounded to six within 24 hours from the first attempt, with a 30-second I/O deadline. Retry delays start after each failure, not from old wall-clock schedules. Configuration waiting does not consume attempts or extend invitation expiry. Production mail providers and external exactly-once delivery are not verified.

Official crypto contracts: [Node cipher AAD](https://nodejs.org/docs/latest-v22.x/api/crypto.html#ciphersetaadbuffer-options) and [decipher authentication tag](https://nodejs.org/docs/latest-v22.x/api/crypto.html#deciphersetauthtagbuffer-encoding).

## Known limitations

- **Workspace settings loading.** `/workspaces/$workspaceId/settings` uses a validated GET loader bridge and a directly seeded client owner, with a route-level settings skeleton. The RSC fragment was rendered but remained non-interactive after some normal hard opens and restarts. This route-local exception retains current authorization, paged metadata, optimistic mutations and invalidation; other streaming routes are unchanged. It does not establish a general framework root cause.

- **Single-process only.** No clustering / multi-process worker fanout. If you need that, deploy the Cloudflare runtime.
- **Turso remote mode is not exercised.** The libSQL client can in principle open a `libsql://` URL with `DATABASE_AUTH_TOKEN`, and the env schema accepts it, but the template does not ship operational guidance for remote mode (replication, embedded replica, sync strategy). Treat it as experimental.
- **No application-level encryption-at-rest helper.** `DATABASE_ENCRYPTION_KEY` is passed straight to the driver; key management is your responsibility.
- **No built-in DLQ surface.** Quarantined outbox rows (`failed_at IS NOT NULL`) are visible only through the log line `[outbox] quarantining event …` and direct SQL inspection. The CF runtime has a dedicated DLQ Worker; the Node runtime intentionally does not duplicate it.

## Optional authenticated PDF

See [Node PDF deployment](pdf_node.md) for the explicit Python/Chrome/font prerequisites, configuration, storage reservations, retained-file lifetime, and safe shutdown/recovery. A new unconfigured installation keeps HTML/Markdown available. Existing PDF ownership that cannot be verified blocks shared storage recovery instead of silently disabling PDF.

## Optional Google authentication

See [Google authentication on Node](google_auth_node.md) for dedicated configuration/key requirements, fixed authentication lifetimes, uncertain-exchange handling, local contract testing, and the approval-gated real Google/mail verification procedure. Unconfigured Google authentication does not disable existing password authentication.
