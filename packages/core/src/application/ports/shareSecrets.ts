export type ShareTokenBinding = Readonly<{
  noteId: string;
  generation: number;
}>;

export interface ShareTokenProtector {
  protect(token: string, binding: ShareTokenBinding): string;
  reveal(envelope: string, binding: ShareTokenBinding): string;
  needsRotation(envelope: string): boolean;
}

export interface SharePasswordWork {
  run<T>(operation: () => Promise<T>): Promise<T>;
  stop(): Promise<void>;
}
