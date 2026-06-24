import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "개인정보처리방침 - ArtBridge" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <main className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-muted-foreground">최종 수정일: 2025년 1월 1일 (데모용)</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">수집하는 개인정보</h2>
          <p>
            서비스 가입 시 이름, 이메일, 역할(크리에이터/팬)을 수집합니다. 서비스 이용 과정에서
            프로그램 신청 내역, 계약 정보, 결제 기록이 생성될 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">개인정보의 이용 목적</h2>
          <p>
            수집된 정보는 서비스 제공, 회원 식별, 알림 발송, 분쟁 해결에 사용됩니다. 마케팅 목적으로는
            사용하지 않습니다. 본 서비스는 데모 목적이며 실제 개인정보 처리 규정과 다를 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">개인정보의 보유 기간</h2>
          <p>
            회원 탈퇴 시 또는 수집 목적이 달성된 후 지체 없이 파기합니다. 법령에 따라 보관이 필요한
            경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">문의</h2>
          <p>
            개인정보 관련 문의는{" "}
            <a href="mailto:privacy@artbridge.demo" className="underline underline-offset-2 text-foreground">
              privacy@artbridge.demo
            </a>
            로 연락해 주세요.
          </p>
        </section>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/terms" className="underline underline-offset-2">
          이용약관
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
