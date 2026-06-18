import { loginAsCreator, loginAsFan } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background p-8">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">ArtBridge</h1>
        <p className="text-sm text-muted-foreground">
          데모 로그인 — 시작할 역할을 선택하세요
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* FR-001: two clear role buttons. FR-002: creator login. */}
        <form action={loginAsCreator}>
          <Card className="h-full transition hover:ring-foreground/20">
            <CardHeader>
              <CardTitle className="text-lg">크리에이터로 시작하기</CardTitle>
              <CardDescription>
                스튜디오 · 멤버십 · 프로그램을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="submit" size="lg" className="w-full">
                크리에이터 로그인
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* FR-003: fan login. */}
        <form action={loginAsFan}>
          <Card className="h-full transition hover:ring-foreground/20">
            <CardHeader>
              <CardTitle className="text-lg">팬으로 시작하기</CardTitle>
              <CardDescription>
                작가와 프로그램을 둘러보고 참여합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="submit" size="lg" variant="outline" className="w-full">
                팬 로그인
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>

      <p className="text-xs text-gray-500">
        시드 사용자로 즉시 로그인됩니다 · 비밀번호 불필요 (Mock 인증)
      </p>
    </main>
  );
}
