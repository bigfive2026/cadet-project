"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
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

  try {
    return await prisma.membership.create({
      data: { userId: user.id, planId },
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
