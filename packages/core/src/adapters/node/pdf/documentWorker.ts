import { parentPort, workerData } from "node:worker_threads";
import { z } from "zod";
import { planPdfDocument } from "./document";

const input = z.strictObject({
  noteId: z.string(),
  title: z.string(),
  html: z.string(),
  style: z.enum(["default", "original"]),
  defaultCss: z.string(),
  appUrl: z.string(),
  media: z.array(
    z.strictObject({
      id: z.string(),
      url: z.string(),
      mime: z.string(),
      bytes: z.number().int().safe().nonnegative(),
    }),
  ),
});
try {
  const checked = input.parse(workerData);
  if (Buffer.byteLength(checked.html) > 800 * 1024) throw Error("input");
  parentPort?.postMessage({ ok: true, value: planPdfDocument(checked) });
} catch {
  parentPort?.postMessage({ ok: false });
} finally {
  parentPort?.close();
}
