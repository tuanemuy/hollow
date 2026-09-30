import { realpath } from "node:fs/promises";
import { isAbsolute } from "node:path";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { DriveServices } from "@repo/core/application/integration/drive/ports";
import { NodeDriveAuthorization } from "./authorization";
import { loadDriveConfig } from "./config";
import { DriveTransportError, NodeDriveExecution } from "./execution";
import { NodeDriveHttp } from "./http";
import { NodeDriveFolderProvider } from "./provider";
import { acquireDriveRuntime } from "./runtimeOwnership";
import { createDriveSecretProtector } from "./secretProtector";

export type NodeDriveOptions = Readonly<{
  configFile?: string;
  appUrl: string;
  canonicalDatabasePath: string | null;
  runtimeDirectory: string | null;
  wake(): void;
}>;
export type NodeDrive = Readonly<{
  services: DriveServices;
  callbackUrl: string;
}>;

export async function createNodeDrive(
  base: Pick<HollowContainer, "clock" | "tokens">,
  options: NodeDriveOptions,
): Promise<NodeDrive | null> {
  if (options.configFile === undefined) return null;
  const config = await loadDriveConfig(options.configFile, options.appUrl);
  if (!config) throw new DriveTransportError();
  let execution: NodeDriveExecution | undefined;
  try {
    const { canonicalDatabasePath, runtimeDirectory } = options;
    if (
      !canonicalDatabasePath ||
      !runtimeDirectory ||
      !isAbsolute(canonicalDatabasePath) ||
      !isAbsolute(runtimeDirectory) ||
      (await realpath(canonicalDatabasePath)) !== canonicalDatabasePath
    )
      throw new DriveTransportError();
    const ownership = await acquireDriveRuntime(
      runtimeDirectory,
      canonicalDatabasePath,
    );
    execution = new NodeDriveExecution(ownership.runtimeGeneration, ownership);
    const http = new NodeDriveHttp(execution);
    return {
      callbackUrl: config.callbackUrl,
      services: {
        runtimeGeneration: ownership.runtimeGeneration,
        picker: config.picker,
        protector: createDriveSecretProtector(config),
        authorization: new NodeDriveAuthorization(config, base, http),
        folders: new NodeDriveFolderProvider(http),
        execution,
        wake: options.wake,
      },
    };
  } catch {
    await execution?.stop();
    throw new DriveTransportError();
  } finally {
    for (const key of config.keys.values()) key.fill(0);
  }
}
