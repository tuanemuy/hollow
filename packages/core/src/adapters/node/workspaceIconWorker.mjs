import { createHash } from "node:crypto";
import { parentPort, workerData } from "node:worker_threads";
import { validateMediaFile } from "./import/mediaWorker.mjs";

try {
  const data = Buffer.from(workerData.data);
  if (
    data.length < 1 ||
    data.length > 5 * 1024 ** 2 ||
    data.length !== workerData.bytes
  )
    throw new Error("ICON_SIZE");
  const { default: sharp } = await import("sharp");
  sharp.cache(false);
  sharp.concurrency(1);
  const image = sharp(data, {
    failOn: "warning",
    limitInputPixels: 40_000_000,
    sequentialRead: true,
    pages: 1,
  });
  const info = await image.metadata();
  if (
    !["png", "jpeg", "webp"].includes(info.format) ||
    `image/${info.format}` !== workerData.mime
  )
    throw new Error("ICON_FORMAT");
  await validateMediaFile({ file: data, bytes: data.length, format: "image" });
  const result = await image
    .rotate()
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  if (result.data.length > 512 * 1024) throw new Error("ICON_OUTPUT_SIZE");
  const output = new Uint8Array(result.data);
  parentPort.postMessage(
    {
      data: output,
      sha256: createHash("sha256").update(output).digest("hex"),
      width: result.info.width,
      height: result.info.height,
    },
    [output.buffer],
  );
} catch (error) {
  parentPort.postMessage(
    [
      "ICON_SIZE",
      "ICON_FORMAT",
      "ICON_OUTPUT_SIZE",
      "IMPORT_RESOURCE_LIMIT",
    ].includes(error.message)
      ? error.message
      : "ICON_CORRUPT",
  );
}
