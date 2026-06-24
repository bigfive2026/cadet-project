"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/artworks/ImageUploadField";

type SubmitState = "idle" | "pending" | "success" | "error";
type FormFeedback = {
  state: SubmitState;
  message?: string;
};

function formValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? undefined : value;
}

function numberValue(formData: FormData, key: string) {
  const raw = formValue(formData, key);
  return raw == null ? undefined : Number(raw);
}

export function CreatorWorkForm() {
  const [feedback, setFeedback] = useState<FormFeedback>({ state: "idle" });
  const router = useRouter();

  async function submit(formData: FormData) {
    const title = formValue(formData, "title");
    if (!title) {
      setFeedback({ state: "error", message: "작업명을 입력해주세요." });
      return;
    }

    setFeedback({ state: "pending" });
    let res: Response;
    try {
      res = await fetch("/api/creator/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          kind: formValue(formData, "kind"),
          description: formValue(formData, "description"),
          imageUrl: formValue(formData, "imageUrl"),
          externalUrl: formValue(formData, "externalUrl"),
          startedAt: formValue(formData, "startedAt"),
          endedAt: formValue(formData, "endedAt"),
        }),
      });
    } catch {
      setFeedback({ state: "error", message: "네트워크 상태를 확인한 뒤 다시 시도해주세요." });
      return;
    }
    if (res.ok) {
      setFeedback({ state: "success", message: "작업물이 등록되었습니다." });
      router.refresh();
      return;
    }
    setFeedback({ state: "error", message: "입력값을 다시 확인해주세요. 외부 링크는 https://로 시작해야 합니다." });
  }

  return (
    <form
      action={submit}
      className="grid gap-3 rounded-[var(--radius-card)] border border-border-default bg-white p-4"
      onChange={() => {
        if (feedback.state !== "idle") setFeedback({ state: "idle" });
      }}
    >
      <h2 className="font-heading text-lg font-semibold text-text-default">기존 작업물 등록</h2>
      <input name="title" required placeholder="작업명" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="kind" placeholder="유형" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
        <input name="externalUrl" placeholder="외부 링크" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
      </div>
      <textarea name="description" placeholder="설명" rows={3} className="w-full rounded-[var(--radius-control)] border border-border-default px-3 py-2 text-sm" />
      <ImageUploadField name="imageUrl" label="작업물 이미지" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="startedAt" type="date" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
        <input name="endedAt" type="date" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
      </div>
      <Button type="submit" size="sm" disabled={feedback.state === "pending"}>
        {feedback.state === "pending" ? "등록 중" : "작업물 등록"}
      </Button>
      {feedback.state === "success" ? <p className="text-xs text-text-muted">{feedback.message}</p> : null}
      {feedback.state === "error" ? <p className="text-xs text-danger">{feedback.message}</p> : null}
    </form>
  );
}

export function ArtworkForm() {
  const [feedback, setFeedback] = useState<FormFeedback>({ state: "idle" });
  const router = useRouter();

  async function submit(formData: FormData) {
    const title = formValue(formData, "title");
    const priceKrw = numberValue(formData, "priceKrw");
    if (!title) {
      setFeedback({ state: "error", message: "작품명을 입력해주세요." });
      return;
    }
    if (!priceKrw || priceKrw < 1) {
      setFeedback({ state: "error", message: "판매 가격을 1원 이상으로 입력해주세요." });
      return;
    }

    setFeedback({ state: "pending" });
    let res: Response;
    try {
      res = await fetch("/api/creator/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: formValue(formData, "description"),
          imageUrl: formValue(formData, "imageUrl"),
          priceKrw,
          stock: numberValue(formData, "stock"),
          status: formValue(formData, "status") ?? "DRAFT",
        }),
      });
    } catch {
      setFeedback({ state: "error", message: "네트워크 상태를 확인한 뒤 다시 시도해주세요." });
      return;
    }
    if (res.ok) {
      setFeedback({ state: "success", message: "작품이 등록되었습니다." });
      router.refresh();
      return;
    }
    setFeedback({ state: "error", message: "입력값을 다시 확인해주세요." });
  }

  return (
    <form
      action={submit}
      className="grid gap-3 rounded-[var(--radius-card)] border border-border-default bg-white p-4"
      onChange={() => {
        if (feedback.state !== "idle") setFeedback({ state: "idle" });
      }}
    >
      <h2 className="font-heading text-lg font-semibold text-text-default">판매 작품 등록</h2>
      <input name="title" required placeholder="작품명" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
      <textarea name="description" placeholder="설명" rows={3} className="w-full rounded-[var(--radius-control)] border border-border-default px-3 py-2 text-sm" />
      <ImageUploadField name="imageUrl" label="작품 이미지" />
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="priceKrw" required type="number" min={1} placeholder="가격" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
        <input name="stock" required type="number" min={0} defaultValue={1} placeholder="재고" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm" />
        <select name="status" defaultValue="DRAFT" className="h-10 w-full rounded-[var(--radius-control)] border border-border-default px-3 text-sm">
          <option value="DRAFT">임시저장</option>
          <option value="PUBLISHED">판매 공개</option>
          <option value="HIDDEN">숨김</option>
        </select>
      </div>
      <Button type="submit" size="sm" disabled={feedback.state === "pending"}>
        {feedback.state === "pending" ? "등록 중" : "작품 등록"}
      </Button>
      {feedback.state === "success" ? <p className="text-xs text-text-muted">{feedback.message}</p> : null}
      {feedback.state === "error" ? <p className="text-xs text-danger">{feedback.message}</p> : null}
    </form>
  );
}
