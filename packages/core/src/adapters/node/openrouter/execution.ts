import type { CredentialClosedProof } from "@repo/core/application/account/ports";
import { ConflictError } from "@repo/core/application/errors";
import {
  type OpenRouterControlExecution,
  OpenRouterProviderError,
} from "@repo/core/application/integration/openRouter/ports";
import type {
  CredentialUse,
  CredentialUseBinding,
  CredentialUseTarget,
} from "@repo/core/domain/account/deletion";
import {
  type CredentialRuntimeOwner,
  type NativeCredentialTransport,
  NodeCredentialUses,
} from "../auth/credentialRuntimeOwnership";

export class NodeOpenRouterExecution implements OpenRouterControlExecution {
  private readonly running = new Map<Promise<unknown>, AbortController>();
  private stopped = false;
  private readonly credentials: NodeCredentialUses | null;
  readonly provider = "openrouter";
  get credentialOwnership() {
    return this.credentials ? "native-v1" : "unproven";
  }
  constructor(
    ownership: Readonly<{
      owner: CredentialRuntimeOwner;
      transport: NativeCredentialTransport;
      provider: object;
    }> | null = null,
  ) {
    if (ownership && ownership.owner.provider !== this.provider)
      throw new Error("Invalid credential namespace");
    this.credentials = ownership
      ? new NodeCredentialUses(
          ownership.owner,
          ownership.transport,
          ownership.provider,
        )
      : null;
  }
  private owned() {
    if (!this.credentials)
      throw new ConflictError(
        "CREDENTIAL_OWNER_UNKNOWN",
        "連携処理の終了を確認できません。",
      );
    return this.credentials;
  }
  target(id: string, binding: CredentialUseBinding, token: string) {
    return this.owned().target(id, binding, token);
  }
  supportsProvider(provider: object) {
    return this.owned().supportsProvider(provider);
  }
  runOwned<T>(
    target: CredentialUseTarget,
    work: (signal: AbortSignal) => Promise<T>,
  ) {
    return this.run((signal) => this.owned().runOwned(target, signal, work));
  }
  closure(target: CredentialUseTarget) {
    return this.owned().closure(target);
  }
  verify(proof: CredentialClosedProof, saved: CredentialUse) {
    return this.owned().verify(proof, saved);
  }
  acknowledge(proof: CredentialClosedProof) {
    return this.owned().acknowledge(proof);
  }
  cancelUnclaimed(proof: CredentialClosedProof) {
    return this.owned().cancelUnclaimed(proof);
  }
  unacknowledged() {
    return this.owned().unacknowledged();
  }
  recoverableRuntimeIds() {
    return this.owned().recoverableRuntimeIds();
  }
  predecessor(saved: CredentialUse) {
    return this.owned().predecessor(saved);
  }
  acknowledgePredecessors(remaining: readonly string[]) {
    return this.owned().acknowledgePredecessors(remaining);
  }
  async run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.stopped || this.running.size >= 4)
      throw new ConflictError(
        "OPENROUTER_BUSY",
        "連携処理が混み合っています。しばらく待ってからやり直してください。",
      );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const result = Promise.resolve().then(() => work(controller.signal));
    this.running.set(result, controller);
    try {
      const value = await result;
      if (controller.signal.aborted)
        throw new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
      return value;
    } finally {
      clearTimeout(timer);
      this.running.delete(result);
    }
  }
  async stop() {
    this.stopped = true;
    for (const controller of this.running.values()) controller.abort();
    await Promise.allSettled([...this.running.keys()]);
  }
}
