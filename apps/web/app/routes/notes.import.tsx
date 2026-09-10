import { createFileRoute } from "@tanstack/react-router";
import { ImportUpload } from "@/components/hollow/ImportUpload";
export const Route = createFileRoute("/notes/import")({
  component: ImportUpload,
});
