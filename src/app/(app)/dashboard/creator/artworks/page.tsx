import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listCreatorArtworks } from "@/lib/queries/artworks";
import { Card } from "@/components/ui/card";
import { ArtworkForm } from "@/components/artworks/CreatorAssetForms";
import { ArtworkManagerCard } from "@/components/artworks/CreatorAssetManager";

export default async function CreatorArtworksPage() {
  const user = await requireRole("CREATOR");
  if (!user.creatorProfile) {
    redirect("/dashboard/creator");
  }

  const artworks = await listCreatorArtworks(user.creatorProfile.id);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-default">
          판매 작품 관리
        </h1>
        <p className="text-sm text-text-muted">
          팬이 구매할 수 있는 작품을 등록하고 판매 상태와 재고를 관리하세요.
        </p>
      </header>

      <section className="max-w-2xl">
        <ArtworkForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-text-default">등록된 판매 작품</h2>
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
      </section>
    </main>
  );
}
