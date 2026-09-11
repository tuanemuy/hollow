"use client";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { browseErrorMessage } from "@/components/browse/BrowseError";
import { tagRouteSchema } from "@/presentation/tagInput";

export function TagRouteError({
  error,
  reset,
}: {
  error: unknown;
  reset?: () => void;
}) {
  const router = useRouter();
  const search = useRouterState({ select: (state) => state.location.search });
  const parsed = tagRouteSchema.safeParse(search);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  return (
    <section className="hollow-empty" role="alert">
      <h1>タグを表示できませんでした</h1>
      <p>{browseErrorMessage(error)}</p>
      <button
        type="button"
        className="hollow-button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailure("");
          try {
            if (parsed.success && parsed.data.cursor) {
              const { cursor: _cursor, ...first } = parsed.data;
              await router.navigate({ to: "/tags", search: first });
            }
            await router.invalidate();
            reset?.();
          } catch (cause) {
            setFailure(browseErrorMessage(cause));
          } finally {
            setPending(false);
          }
        }}
      >
        先頭から再試行
      </button>{" "}
      <Link to="/notes" search={{}} className="hollow-button">
        個人の一覧へ
      </Link>
      {failure && <p>{failure}</p>}
    </section>
  );
}
