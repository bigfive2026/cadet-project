"use server";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clearSession, setSessionCookie } from "@/lib/session";

/**
 * Mock login (SPEC-001 FR-002, FR-003).
 *
 * Picks a seeded user matching the requested role and establishes it as the
 * current session. Creators are restricted to those with a linked
 * CreatorProfile (FR-009), then redirects to the role's landing page.
 *
 * @param seedIndex optional zero-based index into the matching seed users,
 *   useful for switching between multiple demo creators/fans mid-demo.
 */
export async function loginAs(role: Role, seedIndex = 0): Promise<void> {
  const users = await prisma.user.findMany({
    where:
      role === "CREATOR"
        ? { role, creatorProfile: { isNot: null } }
        : { role },
    include: { creatorProfile: true },
    orderBy: { createdAt: "asc" },
  });

  const user = users[seedIndex] ?? users[0];
  if (!user) {
    throw new Error(`No seeded ${role} user available — run \`npm run db:seed\`.`);
  }

  await setSessionCookie(user.id);
  redirect(role === "CREATOR" ? "/dashboard/creator" : "/creators");
}

/** Mock logout (SPEC-001 FR-007). */
export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}

// Role-specific wrappers so login <form action={...}> can bind directly (FR-001).
export async function loginAsCreator(): Promise<void> {
  await loginAs("CREATOR");
}

export async function loginAsFan(): Promise<void> {
  await loginAs("FAN");
}
