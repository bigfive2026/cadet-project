import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getContractDetail } from "@/lib/queries/contracts";
import { ContractDetail } from "@/components/contracts/ContractDetail";
import { AGREEMENT_TEXT } from "@/lib/contracts";

const FEE_RATE = 0.1;

/**
 * 계약 상세 페이지 (SPEC-006 FR-011, FR-012, AC-001, AC-006, AC-007).
 *
 * 팬 본인 또는 크리에이터 소유자만 접근 가능. 그 외에는 404로 존재를 숨긴다.
 * 결제 완료 여부(PAID/RELEASED)와 서명 여부를 계산해 클라이언트 컴포넌트로 전달한다.
 */
export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const contract = await getContractDetail(id);
  if (!contract) {
    notFound();
  }

  const fanUserId = contract.application.userId;
  const creatorUserId = contract.application.program.creatorProfile.userId;

  const isFan = user.id === fanUserId;
  const isCreatorOwner = user.id === creatorUserId;
  if (!isFan && !isCreatorOwner) {
    // 접근 권한 없음 — 존재 자체를 노출하지 않는다 (FR-011)
    notFound();
  }

  const amount = contract.agreedAmount || contract.application.program.priceKrw;
  const feeKrw = Math.round(amount * FEE_RATE);
  const payout = amount - feeKrw;
  const paid = contract.payments.some(
    (p) => p.status === "PAID" || p.status === "RELEASED",
  );

  return (
    <div className="mx-auto max-w-xl py-6">
      <ContractDetail
        contractId={contract.id}
        programTitle={contract.application.program.title}
        amount={amount}
        feeKrw={feeKrw}
        payout={payout}
        agreementText={AGREEMENT_TEXT}
        fanName={contract.application.user.name}
        creatorName={contract.application.program.creatorProfile.studioName}
        signed={contract.fanSignedAt != null}
        paid={paid}
        viewer={isFan ? "fan" : "creator"}
      />
    </div>
  );
}
