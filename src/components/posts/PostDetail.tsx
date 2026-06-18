/**
 * 포스트 전체 본문 표시 컴포넌트 (SPEC-003 FR-010, AC-002, AC-004, AC-005).
 * canViewPost === true 일 때만 렌더링된다.
 */
export interface PostDetailProps {
  post: {
    id: string;
    title: string;
    body: string;
    visibility: string;
  };
}

export function PostDetail({ post }: PostDetailProps) {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <div className="prose max-w-none whitespace-pre-wrap">{post.body}</div>
    </article>
  );
}
