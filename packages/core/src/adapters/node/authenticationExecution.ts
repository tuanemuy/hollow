import type {
  AuthenticationExecution,
  CredentialClosedProof,
} from "@repo/core/application/account/ports";
import { ConflictError } from "@repo/core/application/errors";
import type { PasswordHasher } from "@repo/core/application/ports/passwordHasher";
import type {
  CredentialUse,
  CredentialUseBinding,
  CredentialUseTarget,
} from "@repo/core/domain/account/deletion";
import {
  type CredentialRuntimeOwner,
  type NativeCredentialTransport,
  NodeCredentialUses,
} from "./auth/credentialRuntimeOwnership";

export class NodeAuthenticationExecution implements AuthenticationExecution {
  private readonly running = new Map<Promise<unknown>, AbortController>();
  private stopped = false;
  private readonly credentials: NodeCredentialUses | null;
  readonly provider = "google";
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
        "認証処理の終了を確認できません。",
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
        "AUTH_BUSY",
        "認証処理が混み合っています。しばらく待ってやり直してください。",
      );
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("AUTH_DEADLINE")),
      10_000,
    );
    const result = Promise.resolve().then(() => work(controller.signal));
    this.running.set(result, controller);
    try {
      const value = await result;
      if (controller.signal.aborted)
        throw new ConflictError(
          "AUTH_EXCHANGE_UNKNOWN",
          "認証結果を確認できません。新しい認証手続きを開始してください。",
        );
      return value;
    } finally {
      clearTimeout(timer);
      this.running.delete(result);
    }
  }
  async stop() {
    this.stopped = true;
    for (const c of this.running.values()) c.abort(new Error("AUTH_STOPPED"));
    await Promise.allSettled([...this.running.keys()]);
  }
}

export class BoundedAuthenticationPasswordHasher implements PasswordHasher {
  private readonly running = new Set<Promise<unknown>>();
  private stopped = false;
  constructor(private readonly inner: PasswordHasher) {}
  private async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.stopped || this.running.size >= 2)
      throw new ConflictError(
        "AUTH_BUSY",
        "認証処理が混み合っています。しばらく待ってやり直してください。",
      );
    const result = Promise.resolve().then(work);
    this.running.add(result);
    try {
      return await result;
    } finally {
      this.running.delete(result);
    }
  }
  hash(password: string) {
    return this.run(() => this.inner.hash(password));
  }
  verify(password: string, hash: string) {
    return this.run(() => this.inner.verify(password, hash));
  }
  async stop() {
    this.stopped = true;
    await Promise.allSettled([...this.running]);
  }
}
