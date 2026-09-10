import { z } from "zod";
import { pack, prepare } from "./model";

const request = z.object({
  id: z.number().int().nonnegative(),
  source: z.string().max(800 * 1024),
});
self.onmessage = (event: MessageEvent<unknown>) => {
  const input = request.safeParse(event.data);
  if (!input.success) return;
  const { id, source } = input.data;
  try {
    self.postMessage({ id, ok: true, value: pack(prepare(source)) });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "WYSIWYGの準備に失敗しました。原文を保持しています。",
    });
  }
};
