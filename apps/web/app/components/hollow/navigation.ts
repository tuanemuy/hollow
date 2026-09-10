export function safeNoteDestination(value: string | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/notes";
  const target = new URL(value, "https://hollow.invalid");
  if (
    target.origin !== "https://hollow.invalid" ||
    !(target.pathname === "/notes" || target.pathname.startsWith("/notes/"))
  )
    return "/notes";
  return `${target.pathname}${target.search}${target.hash}`;
}
