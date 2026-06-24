import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "이용약관 - ArtBridge" };

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <main className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">이용약관</h1>
        <p className="mt-2 text-sm text-muted-foreground">최종 수정일: 2025년 1월 1일 (데모용)</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">제1조 (목적)</h2>
          <p>
            이 약관은 ArtBridge(이하 "서비스")가 제공하는 크리에이터-팬 연결 플랫폼 서비스의 이용 조건 및
            절차에 관한 사항을 규정함을 목적으로 합니다. 본 약관은 데모 시연 목적으로 작성된 예시 문서입니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">제2조 (서비스 이용)</h2>
          <p>
            회원은 서비스에 가입하여 크리에이터 또는 팬으로 활동할 수 있습니다. 크리에이터는 프로그램을
            등록하고 팬의 신청을 관리하며, 팬은 프로그램에 참여하고 결제를 진행할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">제3조 (에스크로 결제)</h2>
          <p>
            결제 금액은 팬이 완료를 승인할 때까지 에스크로로 보관됩니다. 플랫폼 수수료는 10%이며,
            나머지 90%가 크리에이터에게 정산됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">제4조 (면책 조항)</h2>
          <p>
            서비스는 크리에이터와 팬 간의 거래를 중개하며, 거래 결과에 대한 직접적인 책임을 지지 않습니다.
            본 서비스는 데모 목적으로 운영되며 실제 금전 거래는 발생하지 않습니다.
          </p>
        </section>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        <Link href="/" className="underline underline-offset-2 text-muted-foreground">
          홈으로
        </Link>
        </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
