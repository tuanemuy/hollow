import { createHash } from "node:crypto";
import type { RegenerationSourceRequest } from "@repo/core/application/regeneration/services";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeDriveExecution } from "./execution";
import { NodeDriveHttp } from "./http";
import { NodeRegenerationSourceProvider } from "./sourceProvider";

const data = new Uint8Array([1]);
const hash = createHash("sha256").update(data).digest("hex");
const id = "90000000-0000-4000-8000-000000000001";
const request: RegenerationSourceRequest = {
  checkCurrent: async () => {},
  record: {
    id,
    version: 1,
    targetId: id,
    noteId: id,
    originalId: id,
    accountId: id,
    subject: "synthetic",
    fileId: "f",
    bytes: 1,
    sha256: hash,
    folder: {
      id: "p",
      name: "Source",
      driveId: null,
      resourceKeyEnvelope: null,
      checkedAt: new Date(0),
    },
    createdAt: new Date(0),
    webViewLink: null,
    resourceKeyEnvelope: null,
  },
  resourceKey: null,
  accessToken: "synthetic",
  signal: new AbortController().signal,
};
const metadata = {
  id: "f",
  parents: ["p"],
  size: "1",
  sha256Checksum: hash,
  trashed: false,
  explicitlyTrashed: false,
  version: "1",
  mimeType: "text/plain",
  capabilities: { canDownload: true },
};
const executions: NodeDriveExecution[] = [];
function provider(response: (endpoint: "metadata" | "download") => unknown) {
  const execution = new NodeDriveExecution(id);
  executions.push(execution);
  const http = new NodeDriveHttp(execution);
  vi.spyOn(http, "source").mockImplementation(async (input) => ({
    status: 200,
    data: response(input.endpoint),
    location: null,
    range: null,
    cacheControl: null,
    age: null,
  }));
  return new NodeRegenerationSourceProvider(http);
}
afterEach(async () => {
  for (const execution of executions.splice(0)) await execution.stop();
  vi.restoreAllMocks();
});
describe("source metadata contract", () => {
  it("requires before/data/after identity and supports separate final check", async () => {
    const calls: string[] = [];
    const p = provider((endpoint) => {
      calls.push(endpoint);
      return endpoint === "download" ? data : metadata;
    });
    expect(await p.read(request)).toEqual(data);
    await p.inspect(request);
    expect(calls).toEqual(["metadata", "download", "metadata", "metadata"]);
  });
  it.each([
    { trashed: true },
    { parents: ["other"] },
    { id: "other" },
    { size: "2" },
    { sha256Checksum: "b".repeat(64) },
    { capabilities: { canDownload: false } },
    { mimeType: "application/vnd.google-apps.document" },
  ])("rejects invalid premetadata before download %j", async (patch) => {
    let calls = 0;
    const p = provider(() => {
      calls++;
      return { ...metadata, ...patch };
    });
    await expect(p.read(request)).rejects.toBeDefined();
    expect(calls).toBe(1);
  });
  it("rejects checksum before aftermetadata and changed version after download", async () => {
    let calls = 0;
    const bad = provider(() =>
      ++calls === 1 ? metadata : new Uint8Array([2]),
    );
    await expect(bad.read(request)).rejects.toBeDefined();
    expect(calls).toBe(2);
    calls = 0;
    const changed = provider(() =>
      ++calls === 1
        ? metadata
        : calls === 2
          ? data
          : { ...metadata, version: "2" },
    );
    await expect(changed.read(request)).rejects.toBeDefined();
    expect(calls).toBe(3);
  });
});
