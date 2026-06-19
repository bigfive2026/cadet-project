import type { ReactNode } from "react";

/**
 * 스튜디오 헤더 (SPEC-002).
 * cover/profile 이미지, 스튜디오명, 카테고리, 인스타/웹사이트 링크, bio.
 * Null-safe 렌더링 (NFR-004).
 */
export interface StudioHeaderProps {
  studio: {
    studioName: string;
    bio?: string | null;
    category?: string | null;
    coverImageUrl?: string | null;
    profileImageUrl?: string | null;
    instagramUrl?: string | null;
    websiteUrl?: string | null;
  };
  /** 헤더 우측 액션 슬롯 (예: 관심 작가 북마크 버튼). */
  action?: ReactNode;
}

export function StudioHeader({ studio, action }: StudioHeaderProps) {
  return (
    <header className="space-y-3">
      {studio.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={studio.coverImageUrl}
          alt=""
          className="h-40 w-full rounded-xl object-cover"
        />
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {studio.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.profileImageUrl}
              alt={studio.studioName}
              className="size-20 rounded-full object-cover"
            />
          ) : null}
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {studio.studioName}
            </h1>
            {studio.category ? (
              <span className="inline-block w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {studio.category}
              </span>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {studio.bio ? <p className="text-sm text-muted-foreground">{studio.bio}</p> : null}
      {(studio.instagramUrl || studio.websiteUrl) && (
        <div className="flex gap-3 text-sm">
          {studio.instagramUrl ? (
            <a href={studio.instagramUrl} target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
          {studio.websiteUrl ? (
            <a href={studio.websiteUrl} target="_blank" rel="noreferrer">
              Website
            </a>
          ) : null}
        </div>
      )}
    </header>
  );
}
