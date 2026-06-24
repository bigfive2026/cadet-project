import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "고객센터 - ArtBridge" };

const faqs = [
  {
    q: "ArtBridge는 어떤 서비스인가요?",
    a: "ArtBridge는 신진 작가(크리에이터)와 팬을 연결하는 양면 플랫폼입니다. 팬은 작가의 프로그램에 참여하고, 에스크로 방식으로 안전하게 결제할 수 있습니다.",
  },
  {
    q: "프로그램 신청 후 어떻게 진행되나요?",
    a: "신청 → 결제 → 선착순 참여 확정 → 프로그램 진행 → 완료 승인 → 정산 순서로 진행됩니다. 정원이 차면 신청이 마감됩니다.",
  },
  {
    q: "결제는 어떻게 이루어지나요?",
    a: "팬이 프로그램 가격을 결제하면 결제 금액은 에스크로로 보관됩니다. 팬이 완료를 승인하면 크리에이터에게 정산됩니다. 플랫폼 수수료는 10%입니다.",
  },
  {
    q: "계약 금액은 어떻게 결정되나요?",
    a: "크리에이터가 프로그램을 만들 때 입력한 가격으로 고정됩니다. 팬과 크리에이터가 별도로 금액을 조율하지 않습니다.",
  },
  {
    q: "취소·환불은 어떻게 하나요?",
    a: "팬은 마이페이지에서 신청을 취소할 수 있고, 크리에이터는 신청 관리에서 확정 멤버를 제외할 수 있습니다. 결제 후 환불은 상태에 따라 정산 보류 또는 환불 처리됩니다.",
  },
  {
    q: "회원 정보를 수정하고 싶어요.",
    a: "현재 앱 내에서 이름·이메일 수정은 지원되지 않습니다. 변경이 필요하시면 아래 이메일로 문의해 주세요.",
  },
];

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <main className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold">고객센터</h1>
        <p className="mt-2 text-muted-foreground">
          자주 묻는 질문과 문의 방법을 안내드립니다.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">자주 묻는 질문 (FAQ)</h2>
        <div className="divide-y rounded-md border">
          {faqs.map((item, i) => (
            <details key={i} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium select-none">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-md border bg-muted/30 p-6 space-y-2">
        <h2 className="text-base font-semibold">이메일 문의</h2>
        <p className="text-sm text-muted-foreground">
          추가 문의 사항은 아래 이메일로 연락해 주세요. 영업일 기준 1~2일 내에 답변
          드립니다.
        </p>
        <a
          href="mailto:support@artbridge.demo"
          className="text-sm font-medium underline underline-offset-2"
        >
          support@artbridge.demo
        </a>
      </section>

      <div className="text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-2">
          홈으로 돌아가기
        </Link>
      </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
