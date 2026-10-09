"use client";
import { Link, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  checkWorkspaceSlugFn,
  createWorkspaceFn,
} from "@/presentation/hollowWorkspace";
import {
  acceptsWorkspaceResponse,
  workspaceInputProblem,
} from "@/presentation/workspaceInput";

export function WorkspaceCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [availability, setAvailability] = useState<{
    slug: string;
    available: boolean;
    suggestions: readonly string[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [pending, start] = useTransition();
  const [optimistic, indicate] = useOptimistic(
    false,
    (_previous, next: boolean) => next,
  );
  const generation = useRef(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ++generation.current;
    };
  }, []);
  useEffect(() => {
    const ticket = { generation: ++generation.current, identity: slug };
    let disposed = false;
    const current = () =>
      !disposed &&
      acceptsWorkspaceResponse(
        { generation: generation.current, identity: slug },
        ticket,
      );
    setAvailability(null);
    setSlugError("");
    if (!slug || workspaceInputProblem("valid", "", slug)) {
      setChecking(false);
      return;
    }
    setChecking(true);
    const timer = setTimeout(() => {
      void checkWorkspaceSlugFn({ data: { slug } })
        .then((result) => {
          if (current()) setAvailability({ slug, ...result });
        })
        .catch((cause) => {
          if (current())
            setSlugError(
              `識別名の空きを確認できません。${displayError(cause)}`,
            );
        })
        .finally(() => {
          if (current()) setChecking(false);
        });
    }, 300);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [slug]);
  const changeSlug = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized === slug) return;
    ++generation.current;
    setSlug(normalized);
    setAvailability(null);
    setSlugError("");
  };
  return (
    <section>
      <p className="hollow-eyebrow">非公開の保存先</p>
      <h1>ワークスペースを作成</h1>
      <p>
        作成すると自分がオーナーになります。現存する作成済みワークスペースは20件までです。参加数の上限ではありません。
      </p>
      <p className="hollow-help">
        作成後はメンバーを招待できます。公開ページは設定から明示的に公開できます。
      </p>
      <form
        className="hollow-workspace-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy.current || created) return;
          const problem = workspaceInputProblem(name, description, slug);
          if (problem) {
            setError(problem);
            return;
          }
          busy.current = true;
          start(async () => {
            indicate(true);
            setError("");
            let result: Awaited<ReturnType<typeof createWorkspaceFn>>;
            try {
              result = await createWorkspaceFn({
                data: {
                  name: name.trim(),
                  description: description.trim(),
                  ...(slug ? { slug } : {}),
                },
              });
            } catch (cause) {
              if (mounted.current)
                setError(
                  `作成結果を確認できませんでした。入力は保持しています。通信が途切れた場合は保存先メニューの一覧も確認してから再実行してください。${displayError(cause)}`,
                );
              busy.current = false;
              return;
            }
            if (!mounted.current) {
              busy.current = false;
              return;
            }
            setCreated(result);
            try {
              await router.invalidate();
              await router.navigate({
                to: "/workspaces/$workspaceId/settings",
                params: { workspaceId: result.id },
              });
            } catch (cause) {
              if (mounted.current)
                setError(
                  `「${result.name}」は作成済みですが、画面を切り替えられませんでした。${displayError(cause)}`,
                );
            } finally {
              busy.current = false;
            }
          });
        }}
      >
        <label>
          名前（必須・100文字以内）
          <input
            name="workspace-name"
            autoComplete="off"
            required
            value={name}
            disabled={pending || !!created}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <p className="hollow-help">
          {Array.from(name.trim()).length} / 100 文字
        </p>
        <label>
          説明（任意・2,000文字以内）
          <textarea
            name="workspace-description"
            value={description}
            disabled={pending || !!created}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
        </label>
        <label>
          識別名（任意）
          <input
            name="workspace-slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            disabled={pending || !!created}
            onChange={(event) => changeSlug(event.currentTarget.value)}
          />
        </label>
        <p className="hollow-help">
          入力した英字は小文字に変換します。3〜63文字の英小文字・数字・内部のハイフンが使えます。空欄でも作成できます。識別名を設定しても公開されません。
        </p>
        {slug && workspaceInputProblem("valid", "", slug) && (
          <p role="status">{workspaceInputProblem("valid", "", slug)}</p>
        )}
        {checking && <p role="status">識別名の空きを確認中…</p>}
        {slugError && (
          <p role="status" className="hollow-message">
            {slugError} 作成時にもサーバーで確認します。
          </p>
        )}
        {availability?.slug === slug && (
          <div role="status">
            <p>
              {availability.available
                ? "現在、この識別名は利用可能です。作成完了時に最終確認します。"
                : "この識別名は利用できません。"}
            </p>
            {availability.suggestions.length > 0 && (
              <div className="hollow-trash-actions">
                {availability.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="hollow-button"
                    disabled={pending}
                    onClick={() => changeSlug(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="hollow-message">
            {error}
          </p>
        )}
        {created && (
          <p role="status">
            「{created.name}」を作成しました。
            <Link
              to="/workspaces/$workspaceId/settings"
              params={{ workspaceId: created.id }}
            >
              メンバーを招待する
            </Link>
          </p>
        )}
        <div className="hollow-actions">
          <Link to="/notes" search={{}} className="hollow-button">
            個人の一覧へ
          </Link>
          <button
            type="submit"
            className="hollow-button hollow-primary"
            disabled={
              pending ||
              !!created ||
              (availability?.slug === slug && !availability.available)
            }
          >
            {optimistic || pending ? "作成中…" : "非公開ワークスペースを作成"}
          </button>
        </div>
      </form>
    </section>
  );
}
