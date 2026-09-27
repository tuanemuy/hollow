"use client";
import { useEffect, useState, useTransition } from "react";
import type { z } from "zod";
import type { beginGoogleSchema } from "@/presentation/authenticationInput";
import { beginGoogleFn } from "@/presentation/authenticationServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function GoogleEntry({
  mode = "login",
  destination,
  disabled = false,
}: {
  mode?: "login" | "link" | "reauth";
  destination: z.infer<typeof beginGoogleSchema>["destination"];
  disabled?: boolean;
}) {
  const ticket = useAuthenticationOperation();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    const valid = ticket();
    void bootstrapAuthenticationFn()
      .then((value) => {
        if (valid()) setAvailable(value.googleAvailable);
      })
      .catch((cause) => {
        if (valid()) setError(displayError(cause));
      });
  }, [ticket]);
  return (
    <div className="hollow-form">
      {available === false ? (
        <p className="hollow-help">
          Google認証は現在設定されていません。通常のパスワード認証をご利用ください。
        </p>
      ) : (
        <button
          type="button"
          className="hollow-button"
          disabled={disabled || pending || available !== true}
          onClick={() => {
            const valid = ticket();
            setError("");
            start(async () => {
              try {
                await bootstrapAuthenticationFn();
                if (!valid()) return;
                const result = await beginGoogleFn({
                  data: { mode, destination },
                });
                if (valid()) window.location.assign(result.authorizationUrl);
              } catch (cause) {
                if (valid()) setError(displayError(cause));
              }
            });
          }}
        >
          {pending
            ? "Google認証を開始中…"
            : mode === "link"
              ? "Googleを追加"
              : mode === "reauth"
                ? "Googleで本人確認"
                : "Googleで続ける"}
        </button>
      )}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
    </div>
  );
}
