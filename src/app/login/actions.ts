"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

/**
 * 인증 서버 액션 (SPEC-AUTH).
 * mock loginAs* 를 제거하고 Auth.js signIn/signOut 기반으로 교체했다.
 */

export type LoginState = { error: string } | undefined;

const INVALID_CREDENTIALS = "이메일 또는 비밀번호가 올바르지 않습니다.";

function roleHome(_role: "FAN" | "CREATOR" | undefined): string {
  return "/";
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
  redirect(roleHome(undefined));
}

/**
 * Google OAuth 로그인.
 * 버튼은 항상 노출하되, provider env 가 없으면(주로 로컬 dev) 크래시 대신
 * 안내 파라미터와 함께 /login 으로 되돌린다.
 */
export async function loginWithGoogle(): Promise<void> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    redirect("/login?error=google_unconfigured");
  }
  await signIn("google", { redirectTo: "/" });
}

/** 데모 원클릭 로그인 (M1 fix). */
export async function loginAsDemo(role: "creator" | "fan"): Promise<void> {
  const email = role === "creator" ? "creator@artbridge.demo" : "fan1@artbridge.demo";
  await signIn("credentials", { email, password: "demo1234!", redirect: false });
  // role 인자로 이미 목적지를 알고 있으므로 세션 조회 없이 직접 계산한다.
  redirect(roleHome(role === "creator" ? "CREATOR" : "FAN"));
}

/** 로그아웃 — 세션 종료 후 /login 으로 이동. */
export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
