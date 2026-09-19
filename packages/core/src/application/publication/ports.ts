export interface PublicDiscoveryRateRepository {
  reserve(browserHash: string | null, now: Date): Promise<Date | null>;
  prune(now: Date): Promise<void>;
}

export type PublicDiscoveryScope =
  | Readonly<{ kind: "all" }>
  | Readonly<{ kind: "profile"; handle: string }>
  | Readonly<{ kind: "workspace"; slug: string }>;
export type PublicDiscoveryConditions = Readonly<{
  query: string;
  tags: readonly string[];
  zone: string;
  from?: string | undefined;
  until?: string | undefined;
  cursor?: string | undefined;
}>;
export type PublicDiscoveryRequest =
  | Readonly<{
      kind: "list";
      scope: PublicDiscoveryScope;
      conditions: PublicDiscoveryConditions;
      viewerSessionHash?: string | undefined;
    }>
  | Readonly<{ kind: "sitemap-index" }>
  | Readonly<{
      kind: "sitemap-leaf";
      catalogue: "notes" | "profiles" | "workspaces";
      page: number;
    }>;
export type PublicPageOwner =
  | Readonly<{
      kind: "all";
      title: string;
      path: string;
      description: string;
      iconUrl: null;
    }>
  | Readonly<{
      kind: "profile";
      title: string;
      path: string;
      description: string;
      iconUrl: string | null;
      handle: string;
    }>
  | Readonly<{
      kind: "workspace";
      title: string;
      path: string;
      description: string;
      iconUrl: string | null;
      slug: string;
    }>;
export type PublicNoteCard = Readonly<{
  path: string;
  title: string;
  updatedAt: string;
  author: import("../../domain/sharing/entity").ShareAuthor;
  authorUrl: string | null;
  titleParts: readonly import("../browse/ports").TextPart[];
  excerpt: readonly import("../browse/ports").TextPart[];
  thumbnailUrl: string | null;
  tags: readonly string[];
}>;
export type PublicDiscoveryResponse =
  | Readonly<{
      kind: "list";
      page: {
        owner: PublicPageOwner;
        viewer: Readonly<{
          kind: "owner" | "member";
          settingsUrl: string;
          workUrl: string;
        }> | null;
        items: readonly PublicNoteCard[];
        total: number;
        nextCursor: string | null;
        tags: readonly Readonly<{ name: string; count: number }>[];
        conditions: PublicDiscoveryConditions;
      };
    }>
  | Readonly<{ kind: "sitemap-index"; paths: readonly string[] }>
  | Readonly<{
      kind: "sitemap-leaf";
      entries: readonly Readonly<{ path: string; lastmod: string | null }>[];
    }>;
export interface PublicDiscoveryExecution {
  execute(
    request: PublicDiscoveryRequest,
    signal?: AbortSignal,
  ): Promise<PublicDiscoveryResponse>;
  stop(): Promise<void>;
}
