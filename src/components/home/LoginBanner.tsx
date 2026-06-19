"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type SessionUser = { name?: string | null; role?: string | null };

/**
 * 로그인 환영 배너(클라이언트).
 * 홈 페이지를 ISR(정적 캐싱)로 유지하기 위해, 로그인 상태에 따른
 * 개인화 UI 만 클라이언트에서 비동기로 로드한다.
 * 세션은 Auth.js 의 /api/auth/session 엔드포인트에서 조회한다.
 */
export function LoginBanner() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (active && session?.user) setUser(session.user);
      })
      .catch(() => {
        /* 미인증 또는 네트워크 오류 → 배너 미노출 */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const href = user.role === "CREATOR" ? "/dashboard/creator" : "/dashboard/fan";

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        다시 돌아오셨네요, {user.name}님!
      </p>
      <Link href={href} className={buttonVariants({ size: "sm" })}>
        내 페이지로 이동
      </Link>
    </div>
  );
}
