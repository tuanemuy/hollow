import {
  type Client,
  type InArgs,
  type InStatement,
  LibsqlError,
  type Transaction,
  type TransactionMode,
} from "@libsql/client";

/** Serializes the lifetime of local transactions against all other calls on one client. */
export function serializeLocalClient(
  client: Client,
  recoverAdmission?: () => Promise<void>,
): Client {
  let pending: Promise<void> = Promise.resolve();
  async function acquire() {
    const previous = pending;
    let release!: () => void;
    pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    return release;
  }
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    const release = await acquire();
    try {
      return await operation();
    } finally {
      release();
    }
  }
  return {
    get closed() {
      return client.closed;
    },
    get protocol() {
      return client.protocol;
    },
    execute(statement: InStatement, args?: InArgs) {
      return run(() =>
        typeof statement === "string"
          ? client.execute(statement, args)
          : client.execute(statement),
      );
    },
    batch: (statements, mode) => run(() => client.batch(statements, mode)),
    migrate: (statements) => run(() => client.migrate(statements)),
    executeMultiple: (sql) => run(() => client.executeMultiple(sql)),
    sync: () => run(() => client.sync()),
    close: () => client.close(),
    reconnect: () => client.reconnect(),
    async transaction(mode?: TransactionMode) {
      const release = await acquire();
      let transaction: Transaction;
      try {
        transaction = await client.transaction(mode);
      } catch (error) {
        try {
          if (error instanceof LibsqlError && error.code === "SQLITE_BUSY")
            await recoverAdmission?.();
          throw error;
        } finally {
          release();
        }
      }
      let finished = false;
      const unlock = () => {
        if (!finished) {
          finished = true;
          release();
        }
      };
      const assertOpen = () => {
        if (finished)
          throw new LibsqlError(
            "The transaction is closed",
            "TRANSACTION_CLOSED",
          );
      };
      return {
        get closed() {
          return finished || transaction.closed;
        },
        execute: (statement) => {
          assertOpen();
          return transaction.execute(statement);
        },
        batch: (statements) => {
          assertOpen();
          return transaction.batch(statements);
        },
        executeMultiple: (sql) => {
          assertOpen();
          return transaction.executeMultiple(sql);
        },
        async commit() {
          // A failed commit retains ownership until rollback/close completes.
          assertOpen();
          await transaction.commit();
          unlock();
        },
        async rollback() {
          assertOpen();
          try {
            await transaction.rollback();
          } finally {
            try {
              transaction.close();
            } finally {
              unlock();
            }
          }
        },
        close() {
          if (finished) return;
          try {
            transaction.close();
          } finally {
            unlock();
          }
        },
      };
    },
  };
}
