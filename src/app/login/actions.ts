"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth";

/**
 * 인증 서버 액션 (SPEC-AUTH).
 * mock loginAs* 를 제거하고 Auth.js signIn/signOut 기반으로 교체했다.
 */

export type LoginState = { error: string } | undefined;

const INVALID_CREDENTIALS = "이메일 또는 비밀번호가 올바르지 않습니다.";

function roleHome(role: "FAN" | "CREATOR" | undefined): string {
  return role === "CREATOR" ? "/dashboard/creator" : "/creators";
}

/**
 * 이메일/비밀번호 로그인. signIn(redirect:false) → AuthError 면 인라인 에러 반환,
 * 성공 시 callbackUrl 또는 역할별 홈으로 이동.
 */
export async function loginWithCredentials(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    // @MX:NOTE: 잘못된 자격증명/미가입 계정은 모두 동일 메시지로 응답 (사용자 열거 방지).
    if (err instanceof AuthError) return { error: INVALID_CREDENTIALS };
    throw err;
  }

  if (callbackUrl) redirect(callbackUrl);
  const user = await getCurrentUser();
  redirect(roleHome(user?.role));
}

/** Google OAuth 로그인 (provider 가 env 에 있을 때만 호출됨). */
export async function loginWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

/** 로그아웃 — 세션 종료 후 /login 으로 이동. */
export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
