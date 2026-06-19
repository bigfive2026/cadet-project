import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./SignupForm";
import { register } from "./actions";

/**
 * 회원가입 페이지 (SPEC-AUTH).
 * 역할 선택 + 이메일/비밀번호. 가입 성공 시 자동 로그인 후 역할별 홈으로.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">ArtBridge</h1>
        <p className="text-sm text-muted-foreground">
          몇 가지 정보만으로 바로 시작할 수 있어요.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">회원가입</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignupForm action={register} callbackUrl={callbackUrl} />
          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있나요?{" "}
            <Link
              href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
