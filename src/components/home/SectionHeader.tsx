import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionFilters } from "./SectionFilters";

export interface SectionHeaderFilter {
  label: string;
  href: string;
  active?: boolean;
}

export interface SectionHeaderProps {
  title: string;
  href?: string;
  actionLabel?: string;
  filters?: SectionHeaderFilter[];
  className?: string;
}

/**
 * ArtBridge public section header with optional filter tabs and action link.
 */
export function SectionHeader({
  title,
  href,
  actionLabel = "더보기",
  filters,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <h2 className="font-heading text-xl font-bold leading-7 text-text-default">{title}</h2>
      {(filters?.length || href) ? (
        <div className="flex flex-wrap items-center gap-3">
          {filters?.length ? <SectionFilters filters={filters} /> : null}
          {href ? (
            <Link
              href={href}
              className="text-[13px] font-medium leading-[18px] text-brand-primary-hover hover:text-brand-primary-pressed"
            >
              {actionLabel} →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
