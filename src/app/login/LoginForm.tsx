"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoginState } from "@/app/login/actions";

/**
 * 이메일/비밀번호 로그인 폼 (SPEC-AUTH).
 * useActionState 로 서버 액션의 { error } 를 잡아 인라인 에러를 노출한다.
 */
interface LoginFormProps {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  callbackUrl?: string;
}

export function LoginForm({ action, callbackUrl }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3.5">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-[13px] font-bold leading-5 text-text-default">
          이메일
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={pending}
          className="h-10 rounded"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="text-[13px] font-bold leading-5 text-text-default">
          비밀번호
        </label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="h-10 rounded"
        />
      </div>
      <Button type="submit" size="sm" className="h-[38px] w-full rounded" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
      {state?.error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
