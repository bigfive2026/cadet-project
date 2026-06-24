import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCreatorWorks } from "@/lib/queries/artworks";
import { Card } from "@/components/ui/card";
import { CreatorWorkForm } from "@/components/artworks/CreatorAssetForms";
import { CreatorWorkManagerCard } from "@/components/artworks/CreatorAssetManager";

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("ko-KR") : "기간 미정";
}

function formatPeriod(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt && !endedAt) return "기간 미정";
  return `${formatDate(startedAt)} - ${formatDate(endedAt)}`;
}

function dateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function CreatorWorksPage() {
  const user = await requireRole("CREATOR");
  if (!user.creatorProfile) {
    redirect("/dashboard/creator");
  }

  const works = await listCreatorWorks(user.creatorProfile.id);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-default">
          작업 관리
        </h1>
        <p className="text-sm text-text-muted">
          전시, 프로젝트, 포트폴리오 이력을 등록하고 공개 프로필의 작업 탭에 보여주세요.
        </p>
      </header>

      <section className="max-w-2xl">
        <CreatorWorkForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-text-default">등록된 작업</h2>
        {works.length === 0 ? (
          <Card className="p-5 text-sm text-text-muted">등록된 작업물이 없습니다.</Card>
        ) : (
          <ul className="space-y-3">
            {works.map((work) => (
              <li key={work.id}>
                <CreatorWorkManagerCard
                  work={{
                    id: work.id,
                    title: work.title,
                    kind: work.kind,
                    description: work.description,
                    imageUrl: work.imageUrl,
                    externalUrl: work.externalUrl,
                    startedAt: dateInputValue(work.startedAt),
                    endedAt: dateInputValue(work.endedAt),
                    periodLabel: formatPeriod(work.startedAt, work.endedAt),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
