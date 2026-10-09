"use client";
import { assertPassword } from "@repo/core/domain/account/entity";
import { useRef, useState } from "react";

export function passwordFieldErrors(password: string, confirmation?: string) {
  let strength = "";
  try {
    assertPassword(password);
  } catch {
    strength = "英字と数字または記号を含む12〜128文字で入力してください。";
  }
  return {
    password: strength,
    confirmation:
      confirmation !== undefined && password !== confirmation
        ? "パスワードが一致しません。"
        : "",
  };
}

export function PasswordFields({
  prefix,
  disabled,
  confirmation = true,
  label = "新しいパスワード",
}: {
  prefix: string;
  disabled: boolean;
  confirmation?: boolean;
  label?: string;
}) {
  const password = useRef<HTMLInputElement>(null);
  const repeated = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState({ password: "", confirmation: "" });
  const validate = () => {
    const next = passwordFieldErrors(
      password.current?.value ?? "",
      confirmation ? (repeated.current?.value ?? "") : undefined,
    );
    password.current?.setCustomValidity(next.password);
    repeated.current?.setCustomValidity(next.confirmation);
    setErrors(next);
  };
  return (
    <>
      <label htmlFor={`${prefix}-password`}>{label}</label>
      <input
        ref={password}
        id={`${prefix}-password`}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        pattern="(?=.*[a-zA-Z])(?=.*[^a-zA-Z]).+"
        required
        disabled={disabled}
        onChange={validate}
        aria-invalid={Boolean(errors.password)}
        aria-describedby={`${prefix}-password-help`}
      />
      <p id={`${prefix}-password-help`} className="hollow-help">
        {errors.password ||
          "12〜128文字で、英字と数字または記号を組み合わせてください。"}
      </p>
      {confirmation && (
        <>
          <label htmlFor={`${prefix}-confirmation`}>もう一度入力</label>
          <input
            ref={repeated}
            id={`${prefix}-confirmation`}
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={disabled}
            onChange={validate}
            aria-invalid={Boolean(errors.confirmation)}
            aria-describedby={
              errors.confirmation ? `${prefix}-confirmation-error` : undefined
            }
          />
          {errors.confirmation && (
            <p
              id={`${prefix}-confirmation-error`}
              role="alert"
              className="hollow-help"
            >
              {errors.confirmation}
            </p>
          )}
        </>
      )}
    </>
  );
}
