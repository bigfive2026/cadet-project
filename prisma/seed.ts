/* eslint-disable no-console */
import {
  PrismaClient,
  Role,
  PostVisibility,
  ProgramApplicationStatus,
  ProgramStatus,
  PaymentStatus,
  SettlementStatus,
} from "@prisma/client";

/**
 * ArtBridge seed script.
 * Reproduces the demo flow from product.md §5 (core user flow) using idempotent upserts.
 * Run: `npm run db:seed` (or `npx prisma db seed`). Also runs after `prisma migrate reset`.
 *
 * FK order (seed-data.md): users → creator_profiles → membership_plans → programs →
 * posts → memberships → program_applications → contracts → payments → settlements →
 * notifications → reviews.
 */

const prisma = new PrismaClient();
const FEE_RATE = 0.1; // 10% platform fee (tech.md §8)

async function main() {
  console.log("→ Seeding ArtBridge demo data…");

  const creators = await upsertCreators();
  const fans = await upsertFans();
  // SPEC-001 FR-009 / AC-005: every seeded creator MUST have a CreatorProfile.
  // SPEC-002 NFR-001: 각 크리에이터는 5개 확장 필드 + plans/posts/programs 보유.
  const profiles = await Promise.all(
    creators.map((c, i) => ensureCreatorProfile(c.id, i)),
  );
  const profile = profiles[0];

  const plans = await upsertPlans(profile.id);
  const programs = await upsertPrograms(profile.id);
  await upsertPosts(profile.id);

  // SPEC-002 NFR-001: 두 번째 크리에이터도 자체 plans/posts/programs 보유
  const profile2 = profiles[1];
  const plans2 = await upsertPlansFor(profile2.id, "demo2-plan-1");
  await upsertProgramsFor(profile2.id, "demo2-program-1");
  await upsertPostsFor(profile2.id, "demo2-post-1", "demo2-post-2");

  const membership = await upsertMembership(fans[0].id, plans[0].id);
  const acceptedApp = await upsertApplications(programs[0].id, fans);
  const contract = await upsertContract(acceptedApp.id);

  const payments = await upsertPayments(membership.id, contract.id, fans[0].id);
  await upsertSettlements(payments);
  await upsertNotification(fans[0].id);
  await upsertReview(programs[0].id, fans[0].id);
  await upsertCommunityPost(profile.id, fans[0].id);

  console.log("✓ Seed complete.");
  console.log(`  creators: ${creators.map((c) => c.email).join(", ")}`);
  console.log(`  fans: ${fans.map((f) => f.email).join(", ")}`);
}

// ──────────────────────────── 1. Users ────────────────────────────

// SPEC-001 AC-005: minimum 2 creators (each with a CreatorProfile) + 2 fans.
async function upsertCreators() {
  const defs = [
    { email: "creator@artbridge.demo", name: "데모 크리에이터" },
    { email: "creator2@artbridge.demo", name: "데모 크리에이터 2" },
  ];
  return Promise.all(
    defs.map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: {},
        create: { email: d.email, name: d.name, role: Role.CREATOR },
      }),
    ),
  );
}

async function upsertFans() {
  const emails = ["fan1@artbridge.demo", "fan2@artbridge.demo"];
  return Promise.all(
    emails.map((email, i) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: `데모 팬 ${i + 1}`, role: Role.FAN },
      }),
    ),
  );
}

// ──────────────────────────── 2. CreatorProfile ────────────────────────────

// SPEC-002 NFR-001: 각 크리에이터 프로필에 5개 확장 필드 모두 채움.
const CREATOR_PROFILE_DEFS = [
  {
    studioName: "신진작가 스튜디오",
    bio: "현대 미술 작가 데모 스튜디오.",
    category: "회화",
    coverImageUrl: "https://picsum.photos/seed/creator1-cover/1200/400",
    profileImageUrl: "https://picsum.photos/seed/creator1-profile/400/400",
    instagramUrl: "https://instagram.com/artbridge_demo",
    websiteUrl: "https://example.com/creator1",
  },
  {
    studioName: "조각공방 스튜디오",
    bio: "입체 조각과 설치 미술을 다루는 데모 스튜디오.",
    category: "조각",
    coverImageUrl: "https://picsum.photos/seed/creator2-cover/1200/400",
    profileImageUrl: "https://picsum.photos/seed/creator2-profile/400/400",
    instagramUrl: "https://instagram.com/artbridge_demo2",
    websiteUrl: "https://example.com/creator2",
  },
];

async function ensureCreatorProfile(userId: string, index: number) {
  const def = CREATOR_PROFILE_DEFS[index] ?? CREATOR_PROFILE_DEFS[0];
  return prisma.creatorProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, ...def },
  });
}

// ──────────────────────────── 3. MembershipPlan ────────────────────────────

async function upsertPlans(creatorProfileId: string) {
  const defs = [
    { id: "demo-plan-1", title: "브론즈 멤버십", priceKrw: 5000 },
    { id: "demo-plan-2", title: "실버 멤버십", priceKrw: 10000 },
  ];
  return Promise.all(
    defs.map((d) =>
      prisma.membershipPlan.upsert({
        where: { id: d.id },
        update: {},
        create: { ...d, creatorProfileId, description: `${d.title} 데모 플랜` },
      }),
    ),
  );
}

// ──────────────────────────── 4. Program ────────────────────────────

async function upsertPrograms(creatorProfileId: string) {
  return [
    await prisma.program.upsert({
      where: { id: "demo-program-1" },
      update: {},
      create: {
        id: "demo-program-1",
        creatorProfileId,
        title: "데모 클럽 프로그램",
        description: "팬 참여형 데모 프로그램",
        category: "클래스",
        priceKrw: 30000,
        maxParticipants: 10,
        status: ProgramStatus.RECRUITING,
      },
    }),
  ];
}

// ──────────────────────────── 5. Post ────────────────────────────

async function upsertPosts(creatorProfileId: string) {
  const defs: Array<{ id: string; visibility: PostVisibility; priceKrw: number | null }> = [
    { id: "demo-post-1", visibility: PostVisibility.PUBLIC, priceKrw: null },
    { id: "demo-post-2", visibility: PostVisibility.MEMBER_ONLY, priceKrw: null },
    { id: "demo-post-3", visibility: PostVisibility.PAID, priceKrw: 5000 },
  ];
  return Promise.all(
    defs.map((d, i) =>
      prisma.post.upsert({
        where: { id: d.id },
        update: {},
        create: {
          id: d.id,
          creatorProfileId,
          title: `데모 포스트 ${i + 1}`,
          body: `데모 본문 ${i + 1}`,
          visibility: d.visibility,
          priceKrw: d.priceKrw,
        },
      }),
    ),
  );
}

// ──────────────── SPEC-002 NFR-001: creator2 전용 plans/programs/posts ────────────────

async function upsertPlansFor(creatorProfileId: string, id: string) {
  return [
    await prisma.membershipPlan.upsert({
      where: { id },
      update: {},
      create: {
        id,
        creatorProfileId,
        title: "조각공방 멤버십",
        description: "두 번째 크리에이터 데모 멤버십 플랜",
        priceKrw: 8000,
      },
    }),
  ];
}

async function upsertProgramsFor(creatorProfileId: string, id: string) {
  return [
    await prisma.program.upsert({
      where: { id },
      update: {},
      create: {
        id,
        creatorProfileId,
        title: "조각 워크숍",
        description: "두 번째 크리에이터 데모 프로그램",
        category: "워크숍",
        priceKrw: 25000,
        maxParticipants: 8,
        status: ProgramStatus.RECRUITING,
      },
    }),
  ];
}

async function upsertPostsFor(
  creatorProfileId: string,
  publicId: string,
  memberId: string,
) {
  await prisma.post.upsert({
    where: { id: publicId },
    update: {},
    create: {
      id: publicId,
      creatorProfileId,
      title: "조각공방 공개 포스트",
      body: "공개 데모 포스트입니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
  });
  await prisma.post.upsert({
    where: { id: memberId },
    update: {},
    create: {
      id: memberId,
      creatorProfileId,
      title: "조각공방 멤버 포스트",
      body: "멤버 전용 데모 포스트입니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  });
}

// ──────────────────────────── 6. Membership ────────────────────────────

async function upsertMembership(userId: string, planId: string) {
  return prisma.membership.upsert({
    where: { userId_planId: { userId, planId } },
    update: {},
    create: { userId, planId },
  });
}

// ──────────────────────────── 7. ProgramApplication ────────────────────────────

async function upsertApplications(programId: string, fans: Array<{ id: string }>) {
  await prisma.programApplication.upsert({
    where: { id: "demo-app-1" },
    update: {},
    create: { id: "demo-app-1", programId, userId: fans[0].id, status: ProgramApplicationStatus.ACCEPTED },
  });
  await prisma.programApplication.upsert({
    where: { id: "demo-app-2" },
    update: {},
    create: { id: "demo-app-2", programId, userId: fans[1].id, status: ProgramApplicationStatus.PENDING },
  });
  return prisma.programApplication.findUniqueOrThrow({ where: { id: "demo-app-1" } });
}

// ──────────────────────────── 8. Contract ────────────────────────────

async function upsertContract(applicationId: string) {
  return prisma.contract.upsert({
    where: { applicationId },
    update: {},
    create: {
      applicationId,
      terms: { agreed: true, note: "demo contract" },
      agreedAmount: 30000,
      fanSignedAt: new Date(),
      creatorSignedAt: new Date(),
    },
  });
}

// ──────────────────────────── 9. Payment ────────────────────────────

async function upsertPayments(membershipId: string, contractId: string, fanUserId: string) {
  const amount = 10000;
  const feeKrw = Math.round(amount * FEE_RATE);
  return [
    await prisma.payment.upsert({
      where: { id: "demo-payment-1" },
      update: {},
      create: { id: "demo-payment-1", membershipId, contractId, fanUserId, amount, feeKrw, status: PaymentStatus.PAID },
    }),
  ];
}

// ──────────────────────────── 10. Settlement ────────────────────────────

async function upsertSettlements(payments: Array<{ id: string; amount: number; feeKrw: number }>) {
  return Promise.all(
    payments.map((p) =>
      prisma.settlement.upsert({
        where: { paymentId: p.id },
        update: {},
        create: { paymentId: p.id, payout: p.amount - p.feeKrw, status: SettlementStatus.PENDING },
      }),
    ),
  );
}

// ──────────────────────────── 11. Notification ────────────────────────────

async function upsertNotification(userId: string) {
  return prisma.notification.upsert({
    where: { id: "demo-notif-1" },
    update: {},
    create: {
      id: "demo-notif-1",
      userId,
      type: "APPLICATION_ACCEPTED",
      message: "신청이 수락되었습니다.",
      linkUrl: `/contracts/demo-contract-1`,
    },
  });
}

// ──────────────────────────── 13. CommunityPost ────────────────────────────

async function upsertCommunityPost(creatorProfileId: string, authorId: string) {
  return prisma.communityPost.upsert({
    where: { id: "demo-community-1" },
    update: {},
    create: {
      id: "demo-community-1",
      creatorProfileId,
      authorId,
      title: "데모 커뮤니티 글",
      content: "멤버 전용 커뮤니티 첫 글입니다.",
    },
  });
}

// ──────────────────────────── 12. Review ────────────────────────────

async function upsertReview(programId: string, userId: string) {
  return prisma.review.upsert({
    where: { id: "demo-review-1" },
    update: {},
    create: { id: "demo-review-1", programId, userId, rating: 5, comment: "데모 후기" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
