import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPost } from "@/lib/post-access";
import { PostDetail } from "@/components/posts/PostDetail";
import { LockedPostPreview } from "@/components/posts/LockedPostPreview";

/**
 * 포스트 상세 페이지 (SPEC-003 FR-008~011, AC-001/002/004/005, NFR-002).
 *
 * [NFR-002 보안 불변식]: canViewPost === false 이면 post.body를 절대 클라이언트에 전달하지 않는다.
 * PostDetail에는 body가 포함된 post를 전달하고, LockedPostPreview에는 body를 제외한다.
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [currentUser, post] = await Promise.all([
    getCurrentUser(),
    prisma.post.findUnique({ where: { id } }),
  ]);

  if (!post) {
    notFound();
  }

  const canView = await canViewPost(currentUser, post);

  if (canView) {
    return <PostDetail post={post} />;
  }

  // [NFR-002]: 접근 거부 시 body를 전달하지 않음 — LockedPostPreview는 body prop이 없음
  return (
    <LockedPostPreview
      title={post.title}
      creatorId={post.creatorProfileId}
      isPaid={post.visibility === "PAID"}
      postId={post.id}
      priceKrw={post.priceKrw}
      isLoggedIn={currentUser !== null}
    />
  );
}
