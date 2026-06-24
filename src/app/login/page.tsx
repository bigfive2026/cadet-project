import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { loginWithCredentials, loginWithGoogle, loginAsDemo } from "./actions";

/**
 * 로그인 페이지 (SPEC-AUTH).
 * 이메일/비밀번호 폼 + (env 있을 때) Google OAuth 버튼 + 회원가입 링크.
 * 보호 라우트에서 온 경우 callbackUrl 로 복귀한다.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-canvas px-4 py-10">
      <section className="w-full max-w-[360px] rounded-lg border border-border-default bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
        <div className="space-y-3.5">
          <div className="space-y-3">
            <h1 className="text-center font-heading text-2xl font-bold leading-9 text-text-default">
              로그인
            </h1>
            <p className="text-sm leading-5 text-text-muted">
              좋아하는 작가와 계속 연결되는 공간
            </p>
          </div>

          <LoginForm action={loginWithCredentials} callbackUrl={callbackUrl} />

          <div className="space-y-3.5">
            {googleEnabled ? (
              <form action={loginWithGoogle}>
                <button
                  type="submit"
                  className="flex h-[38px] w-full items-center justify-center gap-2 rounded border border-border-default bg-white px-4 py-2 text-[13px] font-bold leading-5 text-text-default transition-colors hover:border-border-strong hover:bg-surface-subtle"
                >
                  <span className="text-base font-bold text-brand-primary">G</span>
                  구글 로그인
                </button>
              </form>
            ) : null}

            <p className="text-center text-[13px] leading-5 text-text-muted">
              계정이 없나요?{" "}
              <Link
                href={
                  callbackUrl
                    ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`
                    : "/signup"
                }
                className="font-bold text-brand-primary hover:text-brand-primary-pressed"
              >
                회원가입
              </Link>
            </p>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-center text-xs leading-5 text-text-muted transition-colors hover:text-text-default">
                데모로 바로 시작
                <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <form action={loginAsDemo.bind(null, "creator")}>
                  <button
                    type="submit"
                    className="h-9 w-full rounded border border-border-default bg-white px-2 text-xs font-semibold text-text-subtle transition-colors hover:border-brand-primary hover:text-brand-primary"
                  >
                    크리에이터
                  </button>
                </form>
                <form action={loginAsDemo.bind(null, "fan")}>
                  <button
                    type="submit"
                    className="h-9 w-full rounded border border-border-default bg-white px-2 text-xs font-semibold text-text-subtle transition-colors hover:border-brand-primary hover:text-brand-primary"
                  >
                    팬
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
