export interface MediaValidator {
  validate(input: {
    body: ReadableStream<Uint8Array>;
    bytes: number;
    format: "image" | "audio";
  }): Promise<void>;
}
