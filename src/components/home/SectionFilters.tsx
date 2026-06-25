"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SectionHeaderFilter } from "./SectionHeader";

export interface SectionFiltersProps {
  filters: SectionHeaderFilter[];
  /** 접힘 상태에서 노출할 칩 개수 (기본 6) */
  collapsedCount?: number;
}

/**
 * 섹션 필터 칩 — 개수가 많으면 "더보기"로 접어 복잡함을 줄인다.
 * 접힘 상태에서도 현재 활성 칩은 항상 보이도록 보장한다.
 */
export function SectionFilters({ filters, collapsedCount = 6 }: SectionFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = filters.length > collapsedCount;

  let visible = filters;
  if (needsCollapse && !expanded) {
    visible = filters.slice(0, collapsedCount);
    const activeIndex = filters.findIndex((f) => f.active);
    if (activeIndex >= collapsedCount) {
      visible = [...visible, filters[activeIndex]];
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1">
        {visible.map((filter) => (
          <Link
            key={`${filter.label}-${filter.href}`}
            href={filter.href}
            className={cn(
              "rounded-md px-2.5 py-1 text-[13px] leading-[18px] text-text-default transition-colors",
              filter.active ? "bg-white font-medium shadow-sm" : "hover:bg-white/70",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>
      {needsCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="rounded-md px-2.5 py-1 text-[13px] font-medium leading-[18px] text-brand-primary transition-colors hover:text-brand-primary-pressed"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      ) : null}
    </div>
  );
}
