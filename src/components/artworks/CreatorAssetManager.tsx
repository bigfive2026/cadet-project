"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUploadField } from "@/components/artworks/ImageUploadField";
import { formatKrw } from "@/lib/format";

type SubmitState = "idle" | "pending" | "success" | "error";

type CreatorWorkItem = {
  id: string;
  title: string;
  kind: string | null;
  description: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  periodLabel: string;
};

type ArtworkItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceKrw: number;
  stock: number;
  status: "DRAFT" | "PUBLISHED" | "RESERVED" | "SOLD" | "HIDDEN";
  orderCount: number;
};

function formText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function formNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? undefined : Number(value);
}

function statusLabel(status: ArtworkItem["status"]) {
  switch (status) {
    case "DRAFT":
      return "임시저장";
    case "PUBLISHED":
      return "판매 공개";
    case "RESERVED":
      return "예약 중";
    case "SOLD":
      return "판매 완료";
    case "HIDDEN":
      return "숨김";
  }
}

export function CreatorWorkManagerCard({ work }: { work: CreatorWorkItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");

  async function submit(formData: FormData) {
    setState("pending");
    const res = await fetch(`/api/creator/works/${work.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? "").trim(),
        kind: formText(formData, "kind"),
        description: formText(formData, "description"),
        imageUrl: formText(formData, "imageUrl"),
        externalUrl: formText(formData, "externalUrl"),
        startedAt: formText(formData, "startedAt"),
        endedAt: formText(formData, "endedAt"),
      }),
    });
    if (res.ok) {
      setState("success");
      setEditing(false);
      router.refresh();
      return;
    }
    setState("error");
  }

  async function deleteWork() {
    if (!window.confirm("이 작업물을 삭제할까요?")) return;
    setState("pending");
    const res = await fetch(`/api/creator/works/${work.id}`, { method: "DELETE" });
    if (res.ok) {
      setState("success");
      router.refresh();
      return;
    }
    setState("error");
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-text-default">{work.title}</p>
          <p className="text-xs text-text-muted">
            {work.kind ?? "작업"} · {work.periodLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="icon-xs" variant="ghost" aria-label="작업물 수정" onClick={() => setEditing((value) => !value)}>
            <Pencil className="size-4" />
          </Button>
          <Button type="button" size="icon-xs" variant="destructive" aria-label="작업물 삭제" disabled={state === "pending"} onClick={deleteWork}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {work.description ? (
        <p className="line-clamp-3 text-sm text-text-muted">{work.description}</p>
      ) : null}
      {editing ? (
        <form action={submit} className="grid gap-3 border-t border-border-default pt-3">
          <input name="title" required defaultValue={work.title} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="kind" defaultValue={work.kind ?? ""} placeholder="유형" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
            <input name="externalUrl" defaultValue={work.externalUrl ?? ""} placeholder="외부 링크" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
          </div>
          <textarea name="description" defaultValue={work.description ?? ""} placeholder="설명" rows={3} className="w-full rounded-[var(--radius-control)] border border-border-default px-3 py-2 text-sm" />
          <ImageUploadField name="imageUrl" label="작업물 이미지" defaultValue={work.imageUrl} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="startedAt" type="date" defaultValue={work.startedAt ?? ""} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
            <input name="endedAt" type="date" defaultValue={work.endedAt ?? ""} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={state === "pending"}>
              {state === "pending" ? "저장 중" : "수정 저장"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              취소
            </Button>
          </div>
        </form>
      ) : null}
      {state === "error" ? <p className="text-xs text-danger">작업물 변경에 실패했습니다.</p> : null}
    </Card>
  );
}

export function ArtworkManagerCard({ artwork }: { artwork: ArtworkItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  async function patchArtwork(payload: Record<string, string | number | null | undefined>) {
    setState("pending");
    setNotice(null);
    const res = await fetch(`/api/creator/artworks/${artwork.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setState("success");
      setEditing(false);
      router.refresh();
      return true;
    }
    setState("error");
    return false;
  }

  async function submit(formData: FormData) {
    await patchArtwork({
      title: String(formData.get("title") ?? "").trim(),
      description: formText(formData, "description"),
      imageUrl: formText(formData, "imageUrl"),
      priceKrw: formNumber(formData, "priceKrw"),
      stock: formNumber(formData, "stock"),
      status: String(formData.get("status") ?? "DRAFT"),
    });
  }

  async function deleteArtwork() {
    const message =
      artwork.orderCount > 0
        ? `주문 ${artwork.orderCount.toLocaleString("ko-KR")}건이 있어 삭제 대신 숨김 처리됩니다. 계속할까요?`
        : "이 판매 작품을 삭제할까요?";
    if (!window.confirm(message)) return;
    setState("pending");
    setNotice(null);
    const res = await fetch(`/api/creator/artworks/${artwork.id}`, { method: "DELETE" });
    if (res.ok) {
      const body = (await res.json()) as { hidden?: boolean };
      setState("success");
      setNotice(body.hidden ? "주문 이력이 있어 숨김 처리했습니다." : null);
      router.refresh();
      return;
    }
    setState("error");
  }

  const canPublish = artwork.status !== "PUBLISHED" && artwork.status !== "SOLD";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-text-default">{artwork.title}</p>
          <p className="text-sm font-semibold text-text-default">
            {formatKrw(artwork.priceKrw)} · 재고 {artwork.stock.toLocaleString("ko-KR")}
          </p>
          <p className="text-xs text-text-muted">
            주문 {artwork.orderCount.toLocaleString("ko-KR")}건
            {artwork.orderCount > 0 ? " · 삭제 시 숨김 처리" : " · 삭제 가능"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-text-muted">
          {statusLabel(artwork.status)}
        </span>
      </div>
      {artwork.description ? (
        <p className="line-clamp-3 text-sm text-text-muted">{artwork.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="xs" variant="outline" onClick={() => setEditing((value) => !value)}>
          <Pencil className="size-4" />
          수정
        </Button>
        {canPublish ? (
          <Button type="button" size="xs" variant="outline" disabled={state === "pending"} onClick={() => patchArtwork({ status: "PUBLISHED" })}>
            <Eye className="size-4" />
            공개
          </Button>
        ) : null}
        {artwork.status !== "HIDDEN" && artwork.status !== "SOLD" ? (
          <Button type="button" size="xs" variant="outline" disabled={state === "pending"} onClick={() => patchArtwork({ status: "HIDDEN" })}>
            <EyeOff className="size-4" />
            숨김
          </Button>
        ) : null}
        <Button type="button" size="xs" variant="destructive" disabled={state === "pending"} onClick={deleteArtwork}>
          <Trash2 className="size-4" />
          삭제
        </Button>
      </div>
      {editing ? (
        <form action={submit} className="grid gap-3 border-t border-border-default pt-3">
          <input name="title" required defaultValue={artwork.title} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
          <textarea name="description" defaultValue={artwork.description ?? ""} placeholder="설명" rows={3} className="w-full rounded-[var(--radius-control)] border border-border-default px-3 py-2 text-sm" />
          <ImageUploadField name="imageUrl" label="작품 이미지" defaultValue={artwork.imageUrl} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="priceKrw" required type="number" min={1} defaultValue={artwork.priceKrw} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
            <input name="stock" required type="number" min={0} defaultValue={artwork.stock} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
            <select name="status" defaultValue={artwork.status === "SOLD" || artwork.status === "RESERVED" ? "HIDDEN" : artwork.status} className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm">
              <option value="DRAFT">임시저장</option>
              <option value="PUBLISHED">판매 공개</option>
              <option value="HIDDEN">숨김</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={state === "pending"}>
              {state === "pending" ? "저장 중" : "수정 저장"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              취소
            </Button>
          </div>
        </form>
      ) : null}
      {notice ? <p className="text-xs text-text-muted">{notice}</p> : null}
      {state === "error" ? <p className="text-xs text-danger">작품 변경에 실패했습니다.</p> : null}
    </Card>
  );
}
