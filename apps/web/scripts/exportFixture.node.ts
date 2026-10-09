import { createHash, randomBytes } from "node:crypto";
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";

export async function createExportConfiguration(root: string, args: string[]) {
  const option = (name: string) => {
    const index = args.indexOf(name);
    const value = index >= 0 ? args[index + 1] : undefined;
    if (!value || !isAbsolute(value))
      throw new Error(`Export fixture requires ${name} <absolute path>.`);
    return value;
  };
  const python = option("--pdf-python");
  const chromeSource = option("--pdf-chrome");
  const bodySource = option("--pdf-body-font");
  const codeSource = option("--pdf-code-font");
  const assets = join(root, "pdf-assets");
  await mkdir(assets, { mode: 0o700 });
  const chromeDirectory = join(assets, "chrome");
  await cp(dirname(chromeSource), chromeDirectory, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  const file = async (path: string) => {
    const bytes = await readFile(path);
    return {
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  };
  const font = async (source: string, name: string) => {
    const target = join(assets, name);
    await copyFile(source, target);
    await chmod(target, 0o600);
    return file(target);
  };
  const pdf = join(root, "export-pdf.json");
  await writeFile(
    pdf,
    JSON.stringify({
      version: 1,
      python,
      chrome: await file(join(chromeDirectory, basename(chromeSource))),
      fonts: {
        body: await font(bodySource, "body-font"),
        code: await font(codeSource, "code-font"),
      },
      capacity: {
        diskBytes: 4 * 1024 ** 3,
        outputBytes: 256 * 1024 ** 2,
        nativeTempBytes: 128 * 1024 ** 2,
        finalCopyBytes: 256 * 1024 ** 2,
        totalMs: 120_000,
        renderMs: 30_000,
        termGraceMs: 3_000,
        leaseMs: 60_000,
        cleanupDelayMs: 5_000,
      },
    }),
    { flag: "wx", mode: 0o600 },
  );
  const key = join(root, "keys", "pdf-ticket.key");
  await writeFile(key, randomBytes(32), { flag: "wx", mode: 0o600 });
  const keyring = join(root, "keys", "pdf-ticket.json");
  await writeFile(
    keyring,
    JSON.stringify({
      activeKeyId: "export-local",
      keys: [{ id: "export-local", path: key }],
    }),
    { flag: "wx", mode: 0o600 },
  );
  return { pdf, keyring };
}
