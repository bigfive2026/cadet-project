import { listCreators } from "@/lib/queries/studio";
import { CreatorCard } from "@/components/creators/CreatorCard";

/**
 * 크리에이터 탐색 페이지 (SPEC-002 FR-002, AC-001).
 * 공개 페이지 — 로그인 여부와 무관하게 크리에이터 카드 그리드를 렌더링.
 */
export default async function CreatorsPage() {
  const creators = await listCreators();
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">작가 둘러보기</h1>
        <p className="text-sm text-muted-foreground">
          아트브릿지 작가들의 스튜디오를 둘러보세요.
        </p>
      </header>
      {creators.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 등록된 작가가 없습니다.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <li key={creator.id}>
              <CreatorCard creator={creator} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
