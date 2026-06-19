import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { loginWithCredentials, loginWithGoogle } from "./actions";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">ArtBridge</h1>
        <p className="text-sm text-muted-foreground">
          계정에 로그인하거나 새로 가입하세요.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm action={loginWithCredentials} callbackUrl={callbackUrl} />

          {googleEnabled ? (
            <>
              <div className="relative py-1 text-center">
                <span className="bg-card relative z-10 px-2 text-xs text-muted-foreground">
                  또는
                </span>
                <span className="absolute inset-x-0 top-1/2 border-t" />
              </div>
              <form action={loginWithGoogle}>
                <button
                  type="submit"
                  className="w-full rounded-md border py-2 text-sm font-medium hover:bg-muted"
                >
                  Google로 계속하기
                </button>
              </form>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            계정이 없나요?{" "}
            <Link
              href={callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500">
        데모 계정: creator@artbridge.demo / fan1@artbridge.demo (비밀번호 demo1234!)
      </p>
    </main>
  );
}
