import type { HollowContainer } from "../di/hollowTypes";
import { importContext } from "../import/context";

export async function collectMediaGarbage(container: HollowContainer) {
  const storage = importContext(container).storage;
  const garbage = await container.unitOfWorkProvider.run(({ assets }) =>
    assets.collectGarbage(container.clock.now()),
  );
  for (const upload of garbage.uploads) {
    await storage.remove(`${upload.id}_source`);
    await storage.remove(`${upload.id}_safe`);
    await container.unitOfWorkProvider.run(({ assets }) =>
      assets.markUploadCleaned(upload.id),
    );
  }
  for (const asset of garbage.assets) {
    await storage.remove(asset.storageKey);
    await container.unitOfWorkProvider.run(({ assets }) =>
      assets.finishDelete(asset.id),
    );
  }
}
