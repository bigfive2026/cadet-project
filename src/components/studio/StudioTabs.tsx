"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { StudioProfileHeader } from "@/components/studio/StudioProfileHeader";
import { PostCardList } from "@/components/studio/PostCardList";
import { MembershipPlanCardList } from "@/components/studio/MembershipPlanCardList";
import { ProgramCardList } from "@/components/studio/ProgramCardList";
import { ArtworkCardList } from "@/components/studio/ArtworkCardList";
import { CommunityPanel } from "@/components/community/CommunityPanel";
import { StudioPortfolioIntro } from "@/components/studio/StudioPortfolioIntro";
import type { PostVisibility } from "@prisma/client";

/**
 * 스튜디오 탭 네비게이션 (SPEC-002 FR-007, SPEC-007 FR-002, FR-003).
 * 5개 탭: 소개 / 포스트 / 멤버십 / 클럽 / 커뮤니티.
 * 커뮤니티 탭은 접근 권한에 따라 글 목록/작성 폼 또는 격벽 안내를 표시한다.
 */
type TabId = "intro" | "posts" | "membership" | "artworks" | "club" | "community";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "intro", label: "소개" },
  { id: "posts", label: "포스트" },
  { id: "membership", label: "멤버십" },
  { id: "artworks", label: "작품" },
  { id: "club", label: "클럽" },
  { id: "community", label: "커뮤니티" },
];

export interface StudioTabsProps {
  studio: {
    studioName: string;
    bio?: string | null;
    category?: string | null;
    coverImageUrl?: string | null;
    profileImageUrl?: string | null;
    instagramUrl?: string | null;
    websiteUrl?: string | null;
    posts?: Array<{
      id: string;
      title: string;
      body?: string | null;
      visibility: PostVisibility;
      priceKrw?: number | null;
      createdAt?: Date | string | null;
      _count?: { likes: number; comments: number };
    }>;
    plans?: Array<{
      id: string;
      title: string;
      description?: string | null;
      priceKrw: number;
      memberships?: Array<{ id: string }>;
    }>;
    programs?: Array<{
      id: string;
      title: string;
      description?: string | null;
      category?: string | null;
      priceKrw: number;
    }>;
    artworks?: Array<{
      id: string;
      title: string;
      description?: string | null;
      imageUrl?: string | null;
      priceKrw: number;
      stock: number;
    }>;
    works?: Array<{
      id: string;
      title: string;
      kind?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      externalUrl?: string | null;
      startedAt?: Date | string | null;
      endedAt?: Date | string | null;
    }>;
  };
  /** 현재 로그인 사용자가 이 크리에이터의 활성 멤버인지 여부 (SPEC-003 FR-006, AC-003) */
  isActiveMember?: boolean;
  /** 멤버십 가입 Server Action — 서버 컴포넌트(page.tsx)에서 전달 */
  joinAction?: (planId: string) => Promise<void>;
  /** 커뮤니티 대상 크리에이터 프로필 id (SPEC-007 FR-004) */
  creatorProfileId: string;
  /** 현재 사용자가 커뮤니티에 접근 가능한지 여부 (SPEC-007 FR-001, FR-002) */
  canAccessCommunity?: boolean;
  /** 커뮤니티 글 목록 (SPEC-007 FR-003) */
  communityPosts?: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: Date | string;
    author: { id: string; name: string };
  }>;
  /** 크리에이터 평점 요약 (SPEC-008 FR-012). 누락 시 소개 탭에 표시하지 않는다. */
  rating?: { avg: number | null; count: number };
  /** 헤더 우측 액션 슬롯 (예: 관심 작가 북마크 버튼, PRD §13.2). */
  headerAction?: ReactNode;
  /** URL 쿼리(?tab=community)에 의한 초기 활성 탭 (SPEC-014 REQ-3-001). */
  initialTab?: TabId;
}

export function StudioTabs({
  studio,
  isActiveMember = false,
  joinAction,
  creatorProfileId,
  canAccessCommunity = false,
  communityPosts = [],
  rating,
  headerAction,
  initialTab,
}: StudioTabsProps) {
  const [active, setActive] = useState<TabId>(initialTab ?? "intro");

  return (
    <div className="space-y-4">
      <StudioProfileHeader
        studio={studio}
        isActiveMember={isActiveMember}
        rating={rating}
        action={headerAction}
      />

      <nav className="flex gap-2 overflow-x-auto border-b border-border-default" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
              (active === t.id
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section>
        {active === "intro" ? (
          <StudioPortfolioIntro
            studio={studio}
            isActiveMember={isActiveMember}
            joinAction={joinAction}
            creatorProfileId={creatorProfileId}
            rating={rating}
          />
        ) : null}
        {active === "posts" ? (
          <PostCardList
            posts={studio.posts ?? []}
            studioName={studio.studioName}
            profileImageUrl={studio.profileImageUrl}
          />
        ) : null}
        {active === "membership" ? (
          <MembershipPlanCardList
            plans={studio.plans ?? []}
            isActiveMember={isActiveMember}
            joinAction={joinAction}
            creatorProfileId={creatorProfileId}
          />
        ) : null}
        {active === "artworks" ? (
          <ArtworkCardList
            artworks={studio.artworks ?? []}
          />
        ) : null}
        {active === "club" ? <ProgramCardList programs={studio.programs ?? []} /> : null}
        {active === "community" ? (
          <CommunityPanel
            creatorProfileId={creatorProfileId}
            canAccess={canAccessCommunity}
            posts={communityPosts}
          />
        ) : null}
      </section>
    </div>
  );
}
