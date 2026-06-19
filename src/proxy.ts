import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Route-level auth gate (SPEC-AUTH, Next 16 `proxy` convention).
 *
 * Auth.js 의 auth() 를 미들웨어로 실행한다. 보호 경로에 비인증 접근 시
 * authConfig.callbacks.authorized 가 false 를 반환하고, Auth.js 가
 * pages.signIn("/login") 으로 redirect 한다 (원래 경로는 callbackUrl 에 보존).
 */
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Protected routes: creator dashboard, notifications, contracts.
  matcher: [
    "/dashboard/:path*",
    "/notifications/:path*",
    "/contracts/:path*",
  ],
};
