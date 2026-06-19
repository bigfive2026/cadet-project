"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toggleBookmark } from "@/lib/bookmarks";
import { mockPaymentProvider } from "@/lib/payment/provider";
import { revalidatePath } from "next/cache";
import type { Membership } from "@prisma/client";

/**
 * 팬이 멤버십 플랜에 가입하는 서버 액션 (SPEC-003 FR-004, FR-005, FR-006, AC-002, AC-003, NFR-003).
 * - Membership 레코드를 생성한다.
 * - Prisma P2002(Unique constraint) 에러를 잡아 기존 멤버십을 반환 (멱등 처리).
 * - 그 외 에러는 재던진다.
 */
export async function joinMembership(planId: string): Promise<Membership> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: 로그인이 필요합니다.");
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { priceKrw: true },
  });
  if (!plan) {
    throw new Error("플랜을 찾을 수 없습니다.");
  }

  // PRD §8.3: 멤버십 가입 → Mock 결제 후 ACTIVE
  await mockPaymentProvider.charge({ amount: plan.priceKrw });

  try {
    return await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: { userId: user.id, planId },
      });
      const feeKrw = Math.round(plan.priceKrw * 0.1);
      await tx.payment.create({
        data: {
          membershipId: membership.id,
          fanUserId: user.id,
          amount: plan.priceKrw,
          feeKrw,
          status: "PAID",
        },
      });
      return membership;
    });
  } catch (err) {
    // NFR-003: @@unique([userId, planId]) 중복 시 P2002 → 기존 레코드 반환
    if (isPrismaUniqueError(err)) {
      const existing = await prisma.membership.findFirst({
        where: { userId: user.id, planId },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * 관심 작가 북마크 토글 Server Action (PRD §13.2).
 * 인증 필요(미인증 401). 성공 시 스튜디오 페이지를 revalidate한다.
 * 반환값의 bookmarked로 클라이언트 UI를 즉시 갱신할 수 있다.
 */
export async function toggleBookmarkAction(
  creatorProfileId: string,
): Promise<{ ok: true; bookmarked: boolean } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Unauthorized: 로그인이 필요합니다." };
  }

  const result = await toggleBookmark(user.id, creatorProfileId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/creators/${creatorProfileId}`);
  revalidatePath("/dashboard/fan/bookmarks");
  return { ok: true, bookmarked: result.data.bookmarked };
}
