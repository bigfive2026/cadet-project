import { Search } from "lucide-react";
import Link from "next/link";
import { listCreators } from "@/lib/queries/studio";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { SectionHeader } from "@/components/home/SectionHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreatorsSearchParams = { q?: string; category?: string; tab?: string; limit?: string };

const DEFAULT_VISIBLE_CREATORS = 6;
const VISIBLE_CREATORS_STEP = 6;

/**
 * 크리에이터 탐색 페이지 (SPEC-002 FR-002, AC-001).
 * 공개 페이지 — 로그인 여부와 무관하게 크리에이터 카드 그리드를 렌더링.
 */
export default async function CreatorsPage({
  searchParams,
}: {
  searchParams?: Promise<CreatorsSearchParams>;
}) {
  const resolvedSearch = await (searchParams ?? Promise.resolve<CreatorsSearchParams>({}));
  const query = resolvedSearch.q?.trim() ?? "";
  const category = resolvedSearch.category?.trim() ?? "";
  const entryTab = resolvedSearch.tab === "artworks" ? "artworks" : undefined;
  const requestedLimit = Number.parseInt(resolvedSearch.limit ?? "", 10);
  const visibleLimit =
    Number.isFinite(requestedLimit) && requestedLimit > DEFAULT_VISIBLE_CREATORS
      ? requestedLimit
      : DEFAULT_VISIBLE_CREATORS;
  const creators = await listCreators();
  const categories = Array.from(
    new Set(creators.map((creator) => creator.category).filter(Boolean))
  ) as string[];
  const normalizedQuery = query.toLocaleLowerCase("ko-KR");
  const filteredCreators = creators.filter((creator) => {
    const matchesCategory = category ? creator.category === category : true;
    const matchesQuery = normalizedQuery
      ? [creator.studioName, creator.bio, creator.category]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase("ko-KR").includes(normalizedQuery))
      : true;

    return matchesCategory && matchesQuery;
  });
  const filters = [
    {
      label: "전체",
      href: buildCreatorsHref({ q: query, tab: entryTab }),
      active: !category,
    },
    ...categories.map((item) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (entryTab) params.set("tab", entryTab);
      params.set("category", item);
      return {
        label: item,
        href: `/creators?${params.toString()}`,
        active: category === item,
      };
    }),
  ];
  const visibleCreators = filteredCreators.slice(0, visibleLimit);
  const hasMore = visibleCreators.length < filteredCreators.length;
  const nextLimit = Math.min(filteredCreators.length, visibleLimit + VISIBLE_CREATORS_STEP);
  const hiddenCount = filteredCreators.length - visibleCreators.length;

  return (
    <div className="space-y-8">
      <section className="rounded-[var(--radius-panel)] border border-border-default bg-white px-6 py-8 shadow-[var(--elevation-1)] sm:px-10 sm:py-10">
        <div className="flex max-w-2xl flex-col gap-5">
          <div className="space-y-2">
            <h1 className="font-heading text-[28px] font-bold leading-9 text-text-default sm:text-[32px] sm:leading-10">
              나만의 크리에이터를 찾아보세요
            </h1>
            <p className="text-base leading-6 text-text-muted">
              다양한 분야의 크리에이터와 함께하는 특별한 경험
            </p>
          </div>
          <form action="/creators" className="flex w-full flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">크리에이터, 프로그램 검색</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                name="q"
                defaultValue={query}
                placeholder="크리에이터, 프로그램 검색..."
                className="h-12 w-full rounded-lg border border-border-strong bg-white py-3 pl-10 pr-4 text-sm text-text-default outline-none transition focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              />
            </label>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "px-6")}
            >
              검색
            </button>
          </form>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeader
          title={entryTab === "artworks" ? "작품 구매 가능한 크리에이터" : "추천 크리에이터"}
          filters={filters}
        />
        {filteredCreators.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-border-default bg-white px-4 py-6 text-sm text-text-muted">
            조건에 맞는 작가가 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCreators.map((creator) => (
                <li key={creator.id}>
                  <CreatorCard creator={creator} entryTab={entryTab} />
                </li>
              ))}
            </ul>
            {hasMore ? (
              <div className="flex justify-center pt-2">
                <Link
                  href={buildCreatorsHref({
                    q: query,
                    category,
                    tab: entryTab,
                    limit: nextLimit,
                  })}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "min-w-[160px] border-brand-primary/30 text-brand-primary hover:border-brand-primary hover:bg-brand-subtle",
                  )}
                >
                  {hiddenCount}명 더 보기
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function buildCreatorsHref({
  q,
  category,
  tab,
  limit,
}: {
  q?: string;
  category?: string;
  tab?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (tab) params.set("tab", tab);
  if (limit && limit > DEFAULT_VISIBLE_CREATORS) params.set("limit", String(limit));
  const query = params.toString();
  return query ? `/creators?${query}` : "/creators";
}
