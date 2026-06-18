import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock (isActiveMember 내부 prisma 호출 대체) ---
const mockFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
  },
}));

import { canViewPost } from "@/lib/post-access";
import type { AppUser } from "@/lib/types";

beforeEach(() => {
  mockFindFirst.mockReset();
});

// 테스트용 공통 픽스처
const fanUser: AppUser = { id: "u-fan", email: "fan@test.com", name: "팬", role: "FAN", creatorProfile: null };
const creatorUser: AppUser = {
  id: "u-creator",
  email: "creator@test.com",
  name: "크리에이터",
  role: "CREATOR",
  creatorProfile: { id: "p-creator", studioName: "스튜디오", bio: null },
};

const publicPost = { id: "post-1", creatorProfileId: "p-creator", visibility: "PUBLIC" as const, title: "공개", body: "본문" };
const memberOnlyPost = { id: "post-2", creatorProfileId: "p-creator", visibility: "MEMBER_ONLY" as const, title: "멤버전용", body: "비밀" };
const paidPost = { id: "post-3", creatorProfileId: "p-creator", visibility: "PAID" as const, title: "유료", body: "구매전용", priceKrw: 5000 };

describe("canViewPost (FR-008, AC-001/004/005)", () => {
  describe("PUBLIC 포스트", () => {
    it("비로그인 사용자(null)도 PUBLIC 포스트를 볼 수 있다 (AC-004)", async () => {
      const result = await canViewPost(null, publicPost);
      expect(result).toBe(true);
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it("팬도 PUBLIC 포스트를 볼 수 있다", async () => {
      const result = await canViewPost(fanUser, publicPost);
      expect(result).toBe(true);
    });
  });

  describe("작성자 본인 판정", () => {
    it("크리에이터 본인은 MEMBER_ONLY 포스트를 잠금 없이 볼 수 있다 (AC-005)", async () => {
      const result = await canViewPost(creatorUser, memberOnlyPost);
      expect(result).toBe(true);
      // 본인 판정이므로 DB 조회 불필요
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it("크리에이터 본인은 PAID 포스트를 볼 수 있다", async () => {
      const result = await canViewPost(creatorUser, paidPost);
      expect(result).toBe(true);
    });
  });

  describe("MEMBER_ONLY 포스트", () => {
    it("활성 멤버인 팬은 MEMBER_ONLY 포스트를 볼 수 있다 (AC-002)", async () => {
      mockFindFirst.mockResolvedValue({ id: "m-1" });
      const result = await canViewPost(fanUser, memberOnlyPost);
      expect(result).toBe(true);
    });

    it("비멤버 팬은 MEMBER_ONLY 포스트를 볼 수 없다 (AC-001)", async () => {
      mockFindFirst.mockResolvedValue(null);
      const result = await canViewPost(fanUser, memberOnlyPost);
      expect(result).toBe(false);
    });

    it("비로그인 사용자는 MEMBER_ONLY 포스트를 볼 수 없다", async () => {
      const result = await canViewPost(null, memberOnlyPost);
      expect(result).toBe(false);
      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });

  describe("PAID 포스트", () => {
    it("비멤버 팬은 PAID 포스트를 볼 수 없다 (MVP: 구매 기록 없음)", async () => {
      const result = await canViewPost(fanUser, paidPost);
      expect(result).toBe(false);
    });

    it("비로그인 사용자는 PAID 포스트를 볼 수 없다", async () => {
      const result = await canViewPost(null, paidPost);
      expect(result).toBe(false);
    });
  });
});
