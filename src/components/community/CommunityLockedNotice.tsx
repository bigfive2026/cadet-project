import Link from "next/link";

/**
 * 비권한 사용자용 커뮤니티 격벽 안내 (SPEC-007 FR-002, AC-001).
 * 커뮤니티 콘텐츠를 숨기고 멤버십 가입 / 프로그램 참여 CTA를 표시한다.
 */
interface CommunityLockedNoticeProps {
  /** 멤버십/클럽 탭이 있는 크리에이터 상세 경로 (선택) */
  creatorHref?: string;
}

export function CommunityLockedNotice({ creatorHref }: CommunityLockedNoticeProps) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">
        멤버십 가입 또는 프로그램 참여 시 열립니다
      </p>
      {creatorHref ? (
        <div className="flex justify-center gap-4 text-sm font-medium text-primary">
          <Link href={creatorHref} className="underline-offset-4 hover:underline">
            멤버십 가입하기
          </Link>
          <Link href={creatorHref} className="underline-offset-4 hover:underline">
            프로그램 참여하기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
