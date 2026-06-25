import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 팬 본인 신청 1건을 진행 스텝퍼로 표시하는 카드 (팬 홈/내 신청 페이지 공용).
 * Figma ArtBridge "MyApplicationItem" 디자인 기준 (node 27:750).
 *
 * 신청 → 결제 → 참여 확정 → 진행 → 완료 5단계 진행을 표시한다.
 * 선착순 프로그램은 계약/금액 조율 없이 신청과 결제로 참여가 확정된다.
 */

const STEPS = ["신청", "결제", "참여 확정", "진행", "완료"] as const;

export interface MyApplicationItemData {
  id: string;
  status: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  deliveryRequestedAt?: Date | string | null;
  completionApprovedAt?: Date | string | null;
  program: {
    id: string;
    title: string;
    priceKrw: number;
    /** 본인이 작성한 리뷰(있으면 작성 완료). */
    reviews?: { id: string }[];
  };
  payment?: {
    status: string;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  } | null;
}

// 신청 상태 + 프로그램 결제 진행 → 현재 도달 스텝 인덱스(0~4).
// 단계: 0 신청 · 1 결제 · 2 참여 확정 · 3 진행 · 4 완료
function resolveStep(app: MyApplicationItemData): number {
  if (app.completionApprovedAt) return 4;
  if (app.deliveryRequestedAt) return 3;
  if (app.status === "ACCEPTED" || app.payment?.status === "PAID" || app.payment?.status === "RELEASED") {
    return 2;
  }
  if (app.status === "PENDING_PAYMENT" || app.status === "RESERVED" || app.payment?.status === "PENDING") {
    return 1;
  }
  return 0;
}

const statusPill: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "신청됨", variant: "secondary" },
  RESERVED: { label: "결제 대기", variant: "secondary" },
  PENDING_PAYMENT: { label: "결제 대기", variant: "secondary" },
  ACCEPTED: { label: "참여 확정", variant: "secondary" },
  REJECTED: { label: "거절됨", variant: "danger" },
  AUTO_REJECTED: { label: "거절됨", variant: "danger" },
  CANCELLED: { label: "취소됨", variant: "secondary" },
  REMOVED: { label: "제외됨", variant: "danger" },
  PAYMENT_FAILED: { label: "결제 실패", variant: "danger" },
};

function formatStepDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function resolveStepDates(application: MyApplicationItemData) {
  const paidAt =
    application.payment?.status === "PAID" || application.payment?.status === "RELEASED"
      ? application.payment.createdAt ?? application.payment.updatedAt
      : null;
  const confirmedAt =
    application.status === "ACCEPTED" ||
    application.payment?.status === "PAID" ||
    application.payment?.status === "RELEASED"
      ? paidAt ?? application.updatedAt
      : null;

  return [
    application.createdAt,
    application.payment?.createdAt,
    confirmedAt,
    application.deliveryRequestedAt,
    application.completionApprovedAt,
  ].map(formatStepDate);
}

export function MyApplicationItem({
  application,
  actionSlot,
}: {
  application: MyApplicationItemData;
  /** 스텝퍼 하단 액션 영역 커스텀(예: 결제 페이지의 결제 버튼). 미지정 시 기본 진행 링크. */
  actionSlot?: ReactNode;
}) {
  const rejected =
    application.status === "REJECTED" || application.status === "AUTO_REJECTED";
  const completed = !!application.completionApprovedAt;
  const pill = statusPill[application.status] ?? statusPill.PENDING;
  const step = resolveStep(application);
  const stepDates = resolveStepDates(application);
  const nextActionLabel = step <= 1 ? "결제 진행하기" : "참여 상태 보기";

  return (
    <li className="flex list-none flex-col gap-5 rounded-[var(--radius-card)] border border-border-default bg-white p-5 sm:flex-row sm:items-center">
      {/* 프로그램 정보 (Figma 27:751 ProgramInfo) */}
      <div className="flex items-center gap-3">
        <div className="size-14 shrink-0 rounded-md bg-brand-subtle" aria-hidden />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Link
            href={`/programs/${application.program.id}`}
            className="truncate text-sm font-bold text-text-default hover:underline"
          >
            {application.program.title}
          </Link>
          <p className="text-xs text-text-subtle">
            {application.program.priceKrw.toLocaleString("ko-KR")}원
          </p>
          <Badge
            variant={completed ? "success" : pill.variant}
            className={cn(
              "text-[11px]",
              application.status === "ACCEPTED" && !completed && "text-brand-primary",
            )}
          >
            {completed ? "완료됨" : pill.label}
          </Badge>
        </div>
      </div>

      {/* 진행 스텝퍼 또는 거절 안내 (Figma 27:758 StepperSection) */}
      {rejected ? (
        <p className="text-[13px] text-danger sm:ml-auto">
          아쉽게도 이번 신청은 받아들여지지 않았어요.
        </p>
      ) : (
        <div className="flex min-w-0 flex-col gap-3 sm:ml-auto">
          <div className="w-full max-w-[300px]">
            <div className="grid grid-cols-5">
              {stepDates.map((date, i) => (
                <span
                  key={`${STEPS[i]}-date`}
                  className={cn(
                    "min-h-[14px] px-0.5 text-center text-[10px] leading-[14px]",
                    date ? "text-text-muted" : "text-transparent",
                  )}
                  aria-label={date ? `${STEPS[i]} 날짜 ${date}` : undefined}
                >
                  {date ?? "-"}
                </span>
              ))}
            </div>
            <div className="relative my-1 grid grid-cols-5 items-center">
              <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 -translate-y-1/2 bg-neutral-200" />
              <div
                className="absolute left-[10%] top-1/2 h-0.5 -translate-y-1/2 bg-brand-primary transition-[width]"
                style={{ width: `${(step / (STEPS.length - 1)) * 80}%` }}
              />
              {STEPS.map((label, i) => {
                const reached = i <= step;
                const current = i === step;

                return (
                  <div key={`${label}-marker`} className="relative flex justify-center">
                    <div
                      className={cn(
                        "size-3 rounded-full border-2 transition-colors",
                        reached
                          ? "border-brand-primary bg-brand-primary"
                          : "border-neutral-300 bg-white",
                        current && "ring-2 ring-brand-primary/30",
                      )}
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-5">
              {STEPS.map((label, i) => {
                const reached = i <= step;

                return (
                  <span
                    key={label}
                    className={cn(
                      "px-0.5 text-center text-[11px] leading-[15px]",
                      reached ? "text-text-default" : "text-text-subtle",
                    )}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
          {actionSlot !== undefined ? (
            <div className="mt-1">{actionSlot}</div>
          ) : completed ? (
            // 완료 시: 미작성이면 리뷰 작성 CTA, 작성했으면 완료 표시(클릭 시 내 리뷰 확인).
            (application.program.reviews?.length ?? 0) > 0 ? (
              <Link
                href={`/programs/${application.program.id}`}
                className={cn(
                  buttonVariants({ variant: "outline", className: "mt-1 self-start" }),
                  "pointer-events-auto gap-1 text-success",
                )}
                title="작성한 리뷰 확인"
              >
                리뷰 작성 완료
              </Link>
            ) : (
              <Link
                href={`/programs/${application.program.id}`}
                className={buttonVariants({ className: "mt-1 self-start" })}
              >
                리뷰 쓰기
              </Link>
            )
          ) : ["ACCEPTED", "RESERVED", "PENDING_PAYMENT"].includes(application.status) &&
            !application.deliveryRequestedAt ? (
            <Link
              href={`/programs/${application.program.id}/checkout`}
              className={buttonVariants({ className: "mt-1 self-start" })}
            >
              {nextActionLabel}
            </Link>
          ) : null}
        </div>
      )}
    </li>
  );
}
