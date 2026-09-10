import type { AppConfig } from "@repo/core/application/di/types";

export const content: Omit<AppConfig, "appUrl"> = {
  siteName: "Hollow",
  defaultTitle: "Hollow — 読むための場所",
  defaultDescription: "文書を HTML ノートとして保存し、読み、編集する場所。",
  themeColor: "#ffffff",
};
