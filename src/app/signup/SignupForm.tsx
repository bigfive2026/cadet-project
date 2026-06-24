"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegisterState } from "@/app/signup/actions";

/**
 * 회원가입 폼 (SPEC-AUTH).
 * 역할(팬/크리에이터) 선택 + name + email + password.
 * useActionState 로 fieldErrors/error 를 인라인 노출.
 */
interface SignupFormProps {
  action: (state: RegisterState, formData: FormData) => Promise<RegisterState>;
  callbackUrl?: string;
}

const ROLES = [
  {
    value: "FAN",
    badge: "FAN",
    label: "팬으로 시작하기",
    buttonLabel: "팬으로 가입",
    description: "작가를 탐색하고 멤버십, 프로그램, 커뮤니티에 참여합니다.",
  },
  {
    value: "CREATOR",
    badge: "CREATOR",
    label: "크리에이터로 시작하기",
    buttonLabel: "크리에이터로 가입",
    description: "스튜디오를 운영하고 멤버십, 포스트, 프로그램을 관리합니다.",
  },
] as const;

type SignupRole = (typeof ROLES)[number]["value"];

export function SignupForm({ action, callbackUrl }: SignupFormProps) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    action,
    undefined,
  );
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null);
  const selectedRoleMeta = ROLES.find((role) => role.value === selectedRole);

  return (
    <form action={formAction} className="space-y-3.5">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      {selectedRole ? <input type="hidden" name="role" value={selectedRole} /> : null}

      {!selectedRole ? (
        <fieldset disabled={pending}>
          <legend className="sr-only">역할 선택</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                className="flex min-h-[250px] cursor-pointer flex-col items-start gap-3.5 rounded-lg border border-border-default bg-white p-5 text-left shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-colors hover:border-brand-primary hover:bg-brand-subtle/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending}
                onClick={() => setSelectedRole(r.value)}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-bold leading-4 text-text-default">
                  <span className="size-1.5 rounded-full bg-brand-primary" />
                  {r.badge}
                </span>
                <span className="font-heading text-[22px] font-bold leading-8 text-text-default">
                  {r.label}
                </span>
                <span className="min-h-10 text-sm leading-5 text-text-default">
                  {r.description}
                </span>
                <span className="mt-auto flex h-[38px] w-full items-center justify-center rounded bg-brand-primary px-4 text-[13px] font-bold leading-5 text-white">
                  {r.buttonLabel}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <div className="mx-auto flex w-full max-w-[440px] items-center justify-between rounded-lg bg-white px-3.5 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-text-default">
              <span className="size-2 rounded-full bg-brand-primary" />
              {selectedRoleMeta?.value === "CREATOR" ? "크리에이터로 가입 중" : "팬으로 가입 중"}
            </span>
            <button
              type="button"
              className="text-sm font-bold text-brand-primary hover:text-brand-primary-pressed"
              disabled={pending}
              onClick={() => setSelectedRole(null)}
            >
              변경
            </button>
          </div>

          <div className="mx-auto w-full max-w-[440px] rounded-lg border border-border-default bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
            <div className="space-y-3.5">
              <h2 className="font-heading text-xl font-bold leading-7 text-text-default">
                가입 정보 입력
              </h2>

              <div className="space-y-1.5">
                <label htmlFor="signup-name" className="text-[13px] font-bold leading-5 text-text-default">
                  이름
                </label>
                <Input
                  id="signup-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={pending}
                  placeholder="이름 또는 활동명"
                  className="h-11 rounded-lg bg-surface-subtle"
                />
                <p className="text-xs leading-4 text-text-muted">실명 또는 활동명으로 표시됩니다</p>
                {state?.fieldErrors?.name ? (
                  <p role="alert" className="text-xs text-destructive">
                    {state.fieldErrors.name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="text-[13px] font-bold leading-5 text-text-default">
                  이메일
                </label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={pending}
                  placeholder="you@example.com"
                  className="h-11 rounded-lg bg-surface-subtle"
                />
                <p className="text-xs leading-4 text-text-muted">로그인 아이디로 사용됩니다</p>
                {state?.fieldErrors?.email ? (
                  <p role="alert" className="text-xs text-destructive">
                    {state.fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="text-[13px] font-bold leading-5 text-text-default">
                  비밀번호
                </label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={pending}
                  placeholder="8자 이상"
                  className="h-11 rounded-lg bg-surface-subtle"
                />
                <p className="text-xs leading-4 text-text-muted">비밀번호는 8자 이상이어야 합니다</p>
                {state?.fieldErrors?.password ? (
                  <p role="alert" className="text-xs text-destructive">
                    {state.fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <Button type="submit" size="sm" className="h-[38px] w-full rounded" disabled={pending}>
                {pending ? "가입 중…" : "가입하고 계속하기"}
              </Button>
            </div>
          </div>
        </>
      )}

      {state?.error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
