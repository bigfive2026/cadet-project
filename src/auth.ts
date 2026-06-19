import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@prisma/client";

/**
 * Auth.js v5 노드 설정 (SPEC-AUTH).
 * - 어댑터: PrismaAdapter (Google OAuth 계정 → Account 모델 연결)
 * - 세션 전략: JWT (Credentials provider 는 DB 세션 미지원)
 * - providers: Credentials(이메일/비밀번호) + Google(env 있을 때만)
 */

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "이메일", type: "email" },
    password: { label: "비밀번호", type: "password" },
  },
  authorize: async (raw) => {
    const email = raw?.email;
    const password = raw?.password;
    if (typeof email !== "string" || typeof password !== "string") {
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    // @MX:NOTE: passwordHash 가 없는 계정(OAuth 전용)은 비밀번호 로그인 불가.
    if (!user || !user.passwordHash) return null;
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    };
  },
});

// Google OAuth — client id/secret 이 있을 때만 provider 에 포함.
// @MX:NOTE: env 가 비어있으면 Auth.js 가 Google 을 인지하지 못해 자동 비활성화.
const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [credentialsProvider, ...googleProvider],
  callbacks: {
    authorized: authConfig.callbacks?.authorized,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if ("role" in user && user.role) token.role = user.role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const t = token as { id?: string; role?: Role };
        if (t.id) session.user.id = t.id;
        if (t.role) session.user.role = t.role;
      }
      return session;
    },
  },
});
