import { type Client, createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { serializeLocalClient } from "./serializedClient";

export type Database = LibSQLDatabase<typeof schema>;
const localFiles = new WeakMap<Client, string>();
const databaseFiles = new WeakMap<Database, string>();
export function localDatabaseFile(database: Database): string | null {
  return databaseFiles.get(database) ?? null;
}

export type CreateLibsqlClientOptions = Readonly<{
  url: string;
  authToken?: string;
  encryptionKey?: string;
}>;

/**
 * Creates a libSQL client. URLs may be `file:`, `:memory:`, or any
 * remote form the driver supports. PRAGMAs are not applied here — call
 * {@link applyPragmas} after construction in production paths.
 */
export function createLibsqlClient(options: CreateLibsqlClientOptions): Client {
  const client = createClient({
    url: options.url,
    ...(options.authToken !== undefined
      ? { authToken: options.authToken }
      : {}),
    ...(options.encryptionKey !== undefined
      ? { encryptionKey: options.encryptionKey }
      : {}),
  });
  if (client.protocol !== "file") return client;
  const pathname = options.url.startsWith("file:")
    ? decodeURIComponent(new URL(options.url).pathname)
    : null;
  const persistent =
    pathname !== null &&
    pathname !== ":memory:" &&
    !pathname.startsWith(":memory:?");
  const serialized = serializeLocalClient(
    client,
    persistent
      ? async () => {
          try {
            await client.reconnect();
            await client.execute("PRAGMA foreign_keys = ON");
            await client.execute("PRAGMA busy_timeout = 5000");
          } catch (error) {
            client.close();
            throw error;
          }
        }
      : undefined,
  );
  if (options.url.startsWith("file:"))
    localFiles.set(serialized, options.url.slice(5));
  return serialized;
}

/**
 * Apply production PRAGMAs: `WAL` (readers unblocked by single writer),
 * `foreign_keys=ON` (match D1 default), `busy_timeout=5000` (the only
 * buffer against transient contention — the UoW does not retry).
 * Pass `wal: false` for `:memory:` test databases.
 */
export async function applyPragmas(
  client: Client,
  options: { wal?: boolean } = {},
): Promise<void> {
  const wal = options.wal ?? true;
  if (wal) {
    await client.execute("PRAGMA journal_mode = WAL");
  }
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("PRAGMA busy_timeout = 5000");
}

/**
 * Wraps a libSQL `Client` into a Drizzle handle pre-bound to the project
 * schema. Caller owns the client lifecycle (`client.close()` at shutdown).
 */
export function getDatabase(client: Client): Database {
  const database = drizzle(client, { schema });
  const file = localFiles.get(client);
  if (file !== undefined) databaseFiles.set(database, file);
  return database;
}
