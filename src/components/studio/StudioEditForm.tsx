"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 스튜디오 편집 폼 (SPEC-002 AC-005, FR-006).
 * profile 값으로 prefill. 제출 시 PATCH /api/studio.
 * 성공 → 공개 프로필로 리다이렉트. 실패 → 에러 메시지.
 */
export interface StudioEditFormProps {
  profile: {
    id: string;
    studioName: string;
    bio?: string | null;
    category?: string | null;
    coverImageUrl?: string | null;
    profileImageUrl?: string | null;
    instagramUrl?: string | null;
    websiteUrl?: string | null;
  };
}

export function StudioEditForm({ profile }: StudioEditFormProps) {
  const [studioName, setStudioName] = useState(profile.studioName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [category, setCategory] = useState(profile.category ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(profile.coverImageUrl ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(profile.profileImageUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(profile.instagramUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/studio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorProfileId: profile.id,
          studioName,
          bio,
          category,
          coverImageUrl,
          profileImageUrl,
          instagramUrl,
          websiteUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `저장에 실패했습니다 (HTTP ${res.status}).`);
        return;
      }
      redirect(`/creators/${profile.id}`);
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="studioName" className="text-sm font-medium">
          스튜디오 이름
        </label>
        <Input
          id="studioName"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="bio" className="text-sm font-medium">
          소개글
        </label>
        <textarea
          id="bio"
          className="min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="category" className="text-sm font-medium">
          카테고리
        </label>
        <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label htmlFor="profileImageUrl" className="text-sm font-medium">
          프로필 이미지 URL
        </label>
        <Input
          id="profileImageUrl"
          value={profileImageUrl}
          onChange={(e) => setProfileImageUrl(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="coverImageUrl" className="text-sm font-medium">
          커버 이미지 URL
        </label>
        <Input
          id="coverImageUrl"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="instagramUrl" className="text-sm font-medium">
          Instagram URL
        </label>
        <Input
          id="instagramUrl"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="websiteUrl" className="text-sm font-medium">
          Website URL
        </label>
        <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
