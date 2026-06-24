import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPost } from "@/lib/post-access";
import { PostDetail } from "@/components/posts/PostDetail";
import { LockedPostPreview } from "@/components/posts/LockedPostPreview";
import { PostCreatedToast } from "@/components/posts/PostCreatedToast";

/**
 * 포스트 상세 페이지 (SPEC-003 FR-008~011, AC-001/002/004/005, NFR-002).
 *
 * [NFR-002 보안 불변식]: canViewPost === false 이면 post.body를 절대 클라이언트에 전달하지 않는다.
 * PostDetail에는 body가 포함된 post를 전달하고, LockedPostPreview에는 body를 제외한다.
 */
export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string }>;
}) {
  const [{ id }, resolvedSearch] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { created?: string }),
  ]);
  const currentUser = await getCurrentUser();
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      creatorProfile: {
        select: {
          id: true,
          studioName: true,
          profileImageUrl: true,
          plans: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          author: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      ...(currentUser
        ? {
            likes: {
              where: {
                userId: currentUser.id,
              },
              select: {
                id: true,
              },
            },
          }
        : {}),
    },
  });

  if (!post) {
    notFound();
  }

  // 작성/임시저장 직후 진입 시 완료 토스트 노출.
  const createdKind =
    resolvedSearch?.created === "draft"
      ? "draft"
      : resolvedSearch?.created === "published"
        ? "published"
        : null;

  // 임시저장(DRAFT) 포스트는 작성자 본인에게만 노출.
  if (
    post.status === "DRAFT" &&
    currentUser?.creatorProfile?.id !== post.creatorProfileId
  ) {
    notFound();
  }

  const canView = await canViewPost(currentUser, post);
  const createdToast = createdKind ? <PostCreatedToast kind={createdKind} /> : null;
  const membershipPlanId = post.creatorProfile?.plans?.[0]?.id;
  const membershipCheckoutHref = membershipPlanId
    ? `/creators/${post.creatorProfileId}/memberships/${membershipPlanId}/checkout`
    : undefined;

  if (canView) {
    return (
      <>
        {createdToast}
        <PostDetail
          post={{
            ...post,
            likesCount: post._count?.likes ?? 0,
            viewerHasLiked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
            comments: (post.comments ?? []).map((comment) => ({
              id: comment.id,
              body: comment.body,
              createdAt: comment.createdAt,
              author: comment.author,
              likesCount: 0,
            })),
          }}
          currentUser={
            currentUser
              ? {
                  id: currentUser.id,
                  name: currentUser.name,
                  role: currentUser.role,
                }
              : null
          }
        />
      </>
    );
  }

  // [NFR-002]: 접근 거부 시 body를 전달하지 않음 — LockedPostPreview는 body prop이 없음
  return (
    <>
      {createdToast}
      <LockedPostPreview
        title={post.title}
        creatorId={post.creatorProfileId}
        membershipCheckoutHref={membershipCheckoutHref}
        isPaid={post.visibility === "PAID"}
        postId={post.id}
        priceKrw={post.priceKrw}
        isLoggedIn={currentUser !== null}
      />
    </>
  );
}
