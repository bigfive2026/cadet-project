import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js 설정 (SPEC-AUTH).
 *
 * proxy(미들웨어, Edge runtime)는 이 파일만 임포트한다.
 * authorize 콜백(Node 전용: prisma/bcryptjs)은 src/auth.ts 에서 주입한다.
 * providers 배열은 auth.ts 에서 덮어쓴다.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [], // auth.ts(Node)에서 Credentials + 조건부 Google 주입
  callbacks: {
    /**
     * proxy(Edge) 라우트 보호. 보호 경로에 비인증 접근 시 false → Auth.js 가
     * pages.signIn("/login") 으로 redirect (callbackUrl 에 원래 경로 보존).
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = ["/dashboard", "/notifications", "/contracts"].some(
        (p) => nextUrl.pathname.startsWith(p),
      );
      if (isProtected) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
