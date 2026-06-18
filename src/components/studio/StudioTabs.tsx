"use client";

import { useState } from "react";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { PostCardList } from "@/components/studio/PostCardList";
import { MembershipPlanCardList } from "@/components/studio/MembershipPlanCardList";
import { ProgramCardList } from "@/components/studio/ProgramCardList";
import type { PostVisibility } from "@prisma/client";

/**
 * 스튜디오 탭 네비게이션 (SPEC-002 FR-007).
 * 5개 탭: 소개 / 포스트 / 멤버십 / 클럽 / 커뮤니티.
 * 커뮤니티는 곧 오픈됩니다 플레이스홀더.
 */
type TabId = "intro" | "posts" | "membership" | "club" | "community";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "intro", label: "소개" },
  { id: "posts", label: "포스트" },
  { id: "membership", label: "멤버십" },
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
    }>;
    plans?: Array<{
      id: string;
      title: string;
      description?: string | null;
      priceKrw: number;
    }>;
    programs?: Array<{
      id: string;
      title: string;
      description?: string | null;
      category?: string | null;
      priceKrw: number;
    }>;
  };
}

export function StudioTabs({ studio }: StudioTabsProps) {
  const [active, setActive] = useState<TabId>("intro");

  return (
    <div className="space-y-4">
      <StudioHeader studio={studio} />

      <nav className="flex gap-2 border-b" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={
              "border-b-2 px-3 py-2 text-sm transition-colors " +
              (active === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section>
        {active === "intro" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{studio.bio ?? "작가 소개가 없습니다."}</p>
          </div>
        ) : null}
        {active === "posts" ? <PostCardList posts={studio.posts ?? []} /> : null}
        {active === "membership" ? (
          <MembershipPlanCardList plans={studio.plans ?? []} />
        ) : null}
        {active === "club" ? <ProgramCardList programs={studio.programs ?? []} /> : null}
        {active === "community" ? (
          <p className="text-sm text-muted-foreground">커뮤니티는 곧 오픈됩니다.</p>
        ) : null}
      </section>
    </div>
  );
}
