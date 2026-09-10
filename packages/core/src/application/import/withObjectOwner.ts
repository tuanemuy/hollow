import type { WriteOwner } from "@repo/core/domain/purge/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { importContext } from "./context";
export function withObjectOwner<T>(
  container: HollowContainer,
  owner: WriteOwner,
  fn: () => Promise<T>,
) {
  const storage = importContext(container).storage;
  return storage.withOwner ? storage.withOwner(owner, fn) : fn();
}
