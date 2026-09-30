export function createNodeShutdown(
  input: Readonly<{
    quiesce(): Promise<void>;
    closeListener(): Promise<void>;
    shutdown(): Promise<void>;
  }>,
) {
  let closed = false;
  let finished = false;
  let running: Promise<void> | null = null;
  return (): Promise<void> => {
    if (finished) return Promise.resolve();
    if (running) return running;
    const quiesce = input.quiesce();
    const listener = closed
      ? Promise.resolve()
      : input.closeListener().then(() => {
          closed = true;
        });
    running = (async () => {
      const settled = await Promise.allSettled([quiesce, listener]);
      if (settled.some((result) => result.status === "rejected"))
        throw new Error("NODE_DRAIN_UNPROVEN");
      await input.shutdown();
      finished = true;
    })().finally(() => {
      running = null;
    });
    return running;
  };
}
