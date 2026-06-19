"use client";

import { useActionState } from "react";
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
    label: "팬으로 가입",
    description: "작가·프로그램을 둘러보고 참여합니다",
  },
  {
    value: "CREATOR",
    label: "크리에이터로 가입",
    description: "스튜디오·멤버십·프로그램을 운영합니다",
  },
] as const;

export function SignupForm({ action, callbackUrl }: SignupFormProps) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      <fieldset className="space-y-2" disabled={pending}>
        <legend className="text-sm font-medium">역할 선택</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer flex-col gap-1 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  defaultChecked={r.value === "FAN"}
                  className="accent-primary"
                />
                {r.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="signup-name" className="text-sm font-medium">
          이름
        </label>
        <Input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          disabled={pending}
        />
        {state?.fieldErrors?.name ? (
          <p role="alert" className="text-xs text-destructive">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium">
          이메일
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
        {state?.fieldErrors?.email ? (
          <p role="alert" className="text-xs text-destructive">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium">
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
        />
        {state?.fieldErrors?.password ? (
          <p role="alert" className="text-xs text-destructive">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "가입 중…" : "가입하기"}
      </Button>

      {state?.error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
