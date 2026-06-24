import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCreatorArtworks, listCreatorWorks } from "@/lib/queries/artworks";
import { Card } from "@/components/ui/card";
import { ArtworkForm, CreatorWorkForm } from "@/components/artworks/CreatorAssetForms";
import { ArtworkManagerCard, CreatorWorkManagerCard } from "@/components/artworks/CreatorAssetManager";

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

export default async function CreatorArtworksPage() {
  const user = await requireRole("CREATOR");
  if (!user.creatorProfile) {
    redirect("/dashboard/creator");
  }

  const [works, artworks] = await Promise.all([
    listCreatorWorks(user.creatorProfile.id),
    listCreatorArtworks(user.creatorProfile.id),
  ]);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-default">
          작품 관리
        </h1>
        <p className="text-sm text-text-muted">
          기존 작업 이력과 판매 작품을 등록하고 관리하세요.
        </p>
      </header>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <CreatorWorkForm />
        <ArtworkForm />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-text-default">기존 작업물</h2>
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
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-text-default">판매 작품</h2>
          {artworks.length === 0 ? (
            <Card className="p-5 text-sm text-text-muted">등록된 판매 작품이 없습니다.</Card>
          ) : (
            <ul className="space-y-3">
              {artworks.map((artwork) => (
                <li key={artwork.id}>
                  <ArtworkManagerCard
                    artwork={{
                      id: artwork.id,
                      title: artwork.title,
                      description: artwork.description,
                      imageUrl: artwork.imageUrl,
                      priceKrw: artwork.priceKrw,
                      stock: artwork.stock,
                      status: artwork.status,
                      orderCount: artwork._count.orders,
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
