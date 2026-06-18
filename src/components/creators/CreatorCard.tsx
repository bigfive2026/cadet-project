import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 크리에이터 카드 (SPEC-002 FR-002).
 * Presentational component — null-safe 렌더링 (NFR-004).
 * 클릭 시 /creators/{id}로 이동.
 */
export interface CreatorCardProps {
  creator: {
    id: string;
    studioName: string;
    bio?: string | null;
    profileImageUrl?: string | null;
    category?: string | null;
  };
}

export function CreatorCard({ creator }: CreatorCardProps) {
  return (
    <Link href={`/creators/${creator.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        {creator.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.profileImageUrl}
            alt={creator.studioName}
            className="aspect-square w-full object-cover"
          />
        ) : null}
        <CardHeader>
          <CardTitle>{creator.studioName}</CardTitle>
          {creator.category ? (
            <span className="inline-block w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {creator.category}
            </span>
          ) : null}
        </CardHeader>
        {creator.bio ? (
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground">{creator.bio}</p>
          </CardContent>
        ) : null}
      </Card>
    </Link>
  );
}
