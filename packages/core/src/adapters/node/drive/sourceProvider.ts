import { createHash } from "node:crypto";
import type {
  RegenerationSourceProvider,
  RegenerationSourceRequest,
} from "@repo/core/application/regeneration/services";
import { BusinessRuleError } from "@repo/core/domain/error";
import { z } from "zod";
import type { NodeDriveHttp } from "./http";

const metadata = z.object({
  id: z.string(),
  parents: z.array(z.string()).max(100),
  size: z.string().regex(/^[1-9][0-9]*$/),
  sha256Checksum: z.string().regex(/^[a-f0-9]{64}$/),
  trashed: z.literal(false),
  explicitlyTrashed: z.literal(false),
  version: z.string().regex(/^[1-9][0-9]*$/),
  mimeType: z.string(),
  capabilities: z.object({ canDownload: z.literal(true) }),
});
const changed = () =>
  new BusinessRuleError(
    "REGENERATION_SOURCE_INVALID",
    "保存した原本を現在は取得できません。",
  );
export class NodeRegenerationSourceProvider
  implements RegenerationSourceProvider
{
  constructor(private readonly http: NodeDriveHttp) {}
  private async metadata(input: RegenerationSourceRequest) {
    await input.checkCurrent();
    const response = await this.http.source({
      endpoint: "metadata",
      accessToken: input.accessToken,
      fileId: input.record.fileId,
      resourceKey: input.resourceKey,
      bytes: input.record.bytes,
      signal: input.signal,
    });
    const parsed = metadata.safeParse(response.data);
    if (response.status !== 200 || !parsed.success) throw changed();
    const value = parsed.data;
    if (
      value.id !== input.record.fileId ||
      Number(value.size) !== input.record.bytes ||
      value.sha256Checksum !== input.record.sha256 ||
      value.parents.length !== 1 ||
      value.parents[0] !== input.record.folder.id ||
      value.mimeType.startsWith("application/vnd.google-apps.")
    )
      throw changed();
    await input.checkCurrent();
    return value;
  }
  async inspect(input: RegenerationSourceRequest) {
    await this.metadata(input);
  }
  async read(input: RegenerationSourceRequest): Promise<Uint8Array> {
    const before = await this.metadata(input);
    await input.checkCurrent();
    const response = await this.http.source({
      endpoint: "download",
      accessToken: input.accessToken,
      fileId: input.record.fileId,
      resourceKey: input.resourceKey,
      bytes: input.record.bytes,
      signal: input.signal,
    });
    if (
      response.status !== 200 ||
      !(response.data instanceof Uint8Array) ||
      response.data.byteLength !== input.record.bytes ||
      createHash("sha256").update(response.data).digest("hex") !==
        input.record.sha256
    )
      throw changed();
    const after = await this.metadata(input);
    if (
      before.version !== after.version ||
      before.mimeType !== after.mimeType ||
      input.signal.aborted
    )
      throw changed();
    return response.data;
  }
}
