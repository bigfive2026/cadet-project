"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/auth";
import type { Role } from "@prisma/client";

/**
 * 회원가입 서버 액션 (SPEC-AUTH).
 * 역할 선택(FAN/CREATOR) + name + email + password → passwordHash 저장 → 자동 로그인 → 역할별 홈.
 * 이메일 인증은 생략(데모, SMTP 미사용).
 */

const RegisterSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요").max(50, "이름은 50자 이내여야 합니다"),
  email: z.string().min(1, "이메일을 입력해 주세요").email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
  role: z.enum(["FAN", "CREATOR"]),
});

export type FieldErrors = Partial<Record<keyof z.infer<typeof RegisterSchema>, string>>;
export type RegisterState = { error?: string; fieldErrors?: FieldErrors } | undefined;

export async function register(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const [key, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (msgs && msgs.length > 0) fieldErrors[key as keyof FieldErrors] = msgs[0];
    }
    return { fieldErrors };
  }

  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { fieldErrors: { email: "이미 가입된 이메일입니다" } };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      role: role as Role,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", { email: normalizedEmail, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      // 가입은 성공했으나 자동 로그인 실패 — 로그인 페이지로 유도.
      return { error: "가입이 완료되었습니다. 로그인해 주세요." };
    }
    throw err;
  }

  redirect("/");
}
