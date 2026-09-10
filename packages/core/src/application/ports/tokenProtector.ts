export type TokenBinding = Readonly<{
  invitationId: string;
  generation: number;
}>;
export interface TokenProtector {
  protect(token: string, binding: TokenBinding): string;
  reveal(envelope: string, binding: TokenBinding): string;
}
