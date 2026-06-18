import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PostVisibility } from "@prisma/client";

/**
 * 포스트 가시성 배지 라벨 (SPEC-002).
 */
export function visibilityLabel(v: PostVisibility): string {
  switch (v) {
    case "PUBLIC":
      return "공개";
    case "MEMBER_ONLY":
      return "멤버 전용";
    case "PAID":
      return "유료";
    default:
      return v;
  }
}

export interface PostCardListProps {
  posts: Array<{
    id: string;
    title: string;
    body?: string | null;
    visibility: PostVisibility;
    priceKrw?: number | null;
  }>;
}

export function PostCardList({ posts }: PostCardListProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 포스트가 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {posts.map((post) => (
        <li key={post.id}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{post.title}</CardTitle>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {visibilityLabel(post.visibility)}
                </span>
              </div>
            </CardHeader>
            {post.body ? (
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.body}</p>
              </CardContent>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}
