"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "./trash.css";

const InvitationNoticeContext = createContext<(() => void) | null>(null);

export function useInvitationNotice() {
  const notify = useContext(InvitationNoticeContext);
  if (!notify) throw new Error("招待の操作には画面の状態が必要です。");
  return notify;
}

export function InvitationNoticeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [declined, setDeclined] = useState(false);
  const notice = useRef<HTMLElement>(null);
  useEffect(() => {
    if (declined) notice.current?.focus();
  }, [declined]);
  return (
    <InvitationNoticeContext value={() => setDeclined(true)}>
      {declined && (
        <section
          ref={notice}
          tabIndex={-1}
          className="hollow-trash-toast"
          aria-label="招待の操作結果"
        >
          <p role="status">招待を辞退しました。</p>
          <button
            type="button"
            className="hollow-button"
            onClick={() => setDeclined(false)}
          >
            閉じる
          </button>
        </section>
      )}
      {children}
    </InvitationNoticeContext>
  );
}
