import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * next-auth 타입 보강 (SPEC-AUTH).
 * 세션/JWT에 user.id, user.role 을 주입해 getCurrentUser 가 접근 가능하게 한다.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}
