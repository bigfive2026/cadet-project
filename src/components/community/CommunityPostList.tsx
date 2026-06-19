/**
 * 커뮤니티 글 목록 (SPEC-007 FR-003, AC-002, AC-004).
 * 제목, 작성자명, 작성일(ko locale), 본문을 최신순으로 렌더링한다.
 */
interface CommunityPost {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  author: { id: string; name: string };
}

interface CommunityPostListProps {
  posts: CommunityPost[];
}

export function CommunityPostList({ posts }: CommunityPostListProps) {
  if (posts.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        아직 글이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article key={post.id} className="border rounded-lg p-4 space-y-2">
          <h3 className="font-medium">{post.title}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {post.content}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{post.author.name}</span>
            <span aria-hidden>·</span>
            <span>{new Date(post.createdAt).toLocaleString("ko-KR")}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
