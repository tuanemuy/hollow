export type ZipNameInput = Readonly<{
  ordinal: number;
  filename: string;
}>;
export type ZipEntryName = Readonly<{ ordinal: number; filename: string }>;
export interface ZipNames {
  allocate(entries: readonly ZipNameInput[]): readonly ZipEntryName[];
}
