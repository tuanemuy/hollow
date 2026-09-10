import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { serveStaticAsset } from "./staticAssets.node";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "hollow-assets-"));
  await mkdir(path.join(directory, "client/assets"), { recursive: true });
  await writeFile(
    path.join(directory, "client/assets/app.js"),
    "export const app = true;",
  );
  await writeFile(path.join(directory, "server.js"), "private server");
  await symlink(
    path.join(directory, "server.js"),
    path.join(directory, "client/assets/escape.js"),
  );
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

it("serves production GET and HEAD assets with correct content types", async () => {
  const asset = await serveStaticAsset(
    new Request("http://localhost/assets/app.js"),
    path.join(directory, "client"),
  );
  expect(await asset?.text()).toBe("export const app = true;");
  expect(asset?.headers.get("Content-Type")).toBe(
    "text/javascript; charset=utf-8",
  );
  const head = await serveStaticAsset(
    new Request("http://localhost/assets/app.js", { method: "HEAD" }),
    path.join(directory, "client"),
  );
  expect(await head?.text()).toBe("");
  expect(head?.headers.get("Content-Length")).toBe("24");
});

it("rejects traversal, symlinks outside client, private data, and writes", async () => {
  for (const pathname of [
    "/assets/%2e%2e%2f%2e%2e%2fserver.js",
    "/assets/escape.js",
    "/server.js",
    "/.env",
    "/data/app.db",
    "/data/mailbox/mail.json",
    "/%ZZ.js",
  ]) {
    expect(
      await serveStaticAsset(
        new Request(`http://localhost${pathname}`),
        path.join(directory, "client"),
      ),
    ).toBeNull();
  }
  expect(
    await serveStaticAsset(
      new Request("http://localhost/assets/app.js", { method: "POST" }),
      path.join(directory, "client"),
    ),
  ).toBeNull();
});
