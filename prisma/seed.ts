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
  await upsertPlansFor(profile2.id, "demo2-plan-1");
  await upsertProgramsFor(profile2.id, "demo2-program-1");
  await upsertPostsFor(profile2.id, "demo2-post-1", "demo2-post-2");

  const membership = await upsertMembership(fans[0].id, plans[0].id);
  const acceptedApp = await upsertApplications(programs[0].id, fans);
  const contract = await upsertContract(acceptedApp.id);

  const payments = await upsertPayments(membership.id, contract.id, fans[0].id);
  await upsertSettlements(payments);

  // SPEC-009 NFR-007: PAID 포스트 단건 구매 시연 — fans[1]은 demo-post-3을 구매 완료,
  // fans[0]은 미구매 상태로 두어 잠금/열림 두 화면을 바로 시연한다.
  await upsertPostPurchase("demo-post-3", fans[1].id);

  // SPEC-006 NFR-006: 수락→서명→결제 흐름을 즉시 시연할 수 있도록
  // 미서명·미결제 상태의 ACCEPTED 계약을 1건 추가한다 (fans[1] 기준).
  await upsertPendingContract(programs[0].id, fans[1].id);

  await upsertNotification(fans[0].id);
  // APPLICATION_CREATED 는 크리에이터 수신 알림(linkUrl 이 /dashboard/* 이므로)
  // 팬에게 보내면 접근 불가. 크리에이터에게 보낸다 (UX 일관성, B5 수정).
  await upsertCreatorNotification(creators[0].id);
  // SPEC-008 NFR-004: COMPLETED 프로그램에 리뷰 2개(rating 4, 5 → 평균 4.5).
  await upsertReviews(programs, fans);
  await upsertCommunityPost(profile.id, fans[0].id);
  // SPEC-007 NFR-003: 권한 사용자 관점에서 최소 2개의 커뮤니티 글이 보이도록 추가.
  // 두 번째 글은 크리에이터 본인이 작성한 공지 형태.
  await upsertCommunityPostSecond(profile.id, creators[0].id);

  // PRD §13.2: 팬의 관심 작가 북마크 — 교차로 1명씩 북마크해 목록이 비지 않도록 한다.
  await upsertBookmarks(fans, profiles);

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
  // update 에도 필드를 채운다 — 예전에 빈 프로필로 생성된 레코드가 있으면
  // 재실행 시 5개 확장 필드가 보강된다 (B6 수정).
  return prisma.creatorProfile.upsert({
    where: { userId },
    update: { ...def },
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
        // SPEC-006 FR-007 정합: ACCEPTED + PAID 결제 참여자(demo-app-1)를 가진
        // 프로그램은 결제 완료 시점에 IN_PROGRESS 이다. recruitDeadline은 보존.
        recruitDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: ProgramStatus.IN_PROGRESS,
      },
    }),
    // SPEC-008 NFR-004: 완료된 프로그램 + 리뷰로 크리에이터 평점이 빈 상태로 시작하지 않도록.
    await prisma.program.upsert({
      where: { id: "demo-program-completed" },
      update: {},
      create: {
        id: "demo-program-completed",
        creatorProfileId,
        title: "데모 완료 워크숍",
        description: "이미 완료된 데모 프로그램 — 리뷰 집계용.",
        category: "워크숍",
        priceKrw: 20000,
        maxParticipants: 8,
        recruitDeadline: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: ProgramStatus.COMPLETED,
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
        // SPEC-004 NFR-001: 시드 프로그램은 recruitDeadline을 채운다 (미래 일자).
        recruitDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
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

// SPEC-006 NFR-006: 미서명·미결제 ACCEPTED 계약 (라이브 데모용).
// fanSignedAt/creatorSignedAt을 null로 두어 서명 전 상태를 표현한다.
async function upsertPendingContract(programId: string, fanUserId: string) {
  const app = await prisma.programApplication.upsert({
    where: { id: "demo-app-pending-pay" },
    update: {},
    create: {
      id: "demo-app-pending-pay",
      programId,
      userId: fanUserId,
      status: ProgramApplicationStatus.ACCEPTED,
    },
  });
  return prisma.contract.upsert({
    where: { applicationId: app.id },
    update: {},
    create: {
      applicationId: app.id,
      terms: {
        programTitle: "데모 클럽 프로그램",
        priceKrw: 30000,
        agreement: "데모 약관 — 서명/결제 흐름 시연용",
      },
      agreedAmount: 30000,
      fanSignedAt: null,
      creatorSignedAt: null,
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

// ──────────────── SPEC-009: PAID 포스트 단건 구매 (Payment + Settlement) ────────────────

async function upsertPostPurchase(postId: string, fanUserId: string) {
  const amount = 5000; // demo-post-3 priceKrw (upsertPosts와 일치)
  const feeKrw = Math.round(amount * FEE_RATE);
  const payment = await prisma.payment.upsert({
    where: { id: "demo-post-payment-1" },
    update: {},
    create: { id: "demo-post-payment-1", postId, fanUserId, amount, feeKrw, status: PaymentStatus.PAID },
  });
  await prisma.settlement.upsert({
    where: { paymentId: payment.id },
    update: {},
    create: { paymentId: payment.id, payout: amount - feeKrw, status: SettlementStatus.PENDING },
  });
}

// ──────────────────────────── 11. Notification ────────────────────────────

// SPEC-005 T-016: 미읽음 알림 2~3개 추가 (AC-007 뱃지 데모).
// 팬(fans[0])에게 보내는 알림은 모두 팬이 접근 가능한 공개 라우트로 연결된다.
// update 에도 값 명시 — 기존에 잘못된 linkUrl/userType 으로 생성된 레코드를 보정한다.
async function upsertNotification(userId: string) {
  // 기존 읽음 알림
  await prisma.notification.upsert({
    where: { id: "demo-notif-1" },
    update: {
      userId,
      type: "APPLICATION_ACCEPTED",
      message: "신청이 수락되었습니다.",
      linkUrl: `/programs/demo-program-1`,
      readAt: new Date(), // 읽음 상태
    },
    create: {
      id: "demo-notif-1",
      userId,
      type: "APPLICATION_ACCEPTED",
      message: "신청이 수락되었습니다.",
      linkUrl: `/programs/demo-program-1`,
      readAt: new Date(), // 읽음 상태
    },
  });

  // 미읽음 알림: PROGRAM_CLOSED (팬 수신 → 공개 프로그램 상세)
  await prisma.notification.upsert({
    where: { id: "demo-notif-3" },
    update: {
      userId,
      type: "PROGRAM_CLOSED",
      message: "프로그램 모집이 마감되었습니다.",
      linkUrl: `/programs/demo-program-1`,
    },
    create: {
      id: "demo-notif-3",
      userId,
      type: "PROGRAM_CLOSED",
      message: "프로그램 모집이 마감되었습니다.",
      linkUrl: `/programs/demo-program-1`,
      readAt: null, // 미읽음
    },
  });

  return prisma.notification.findMany({ where: { userId } });
}

// APPLICATION_CREATED 는 크리에이터가 수신하고 /dashboard/* 링크를 가진다.
// 팬이 아닌 크리에이터에게 보내야 링크가 정상 동작한다 (B5 수정).
async function upsertCreatorNotification(userId: string) {
  await prisma.notification.upsert({
    where: { id: "demo-notif-2" },
    // update 에 userId/linkUrl/message 명시 — 기존에 팬에게 잘못 할당되거나
    // 링크가 잘못된 레코드를 크리에이터 + 정확한 링크로 보정한다 (B5 수정).
    update: {
      userId,
      type: "APPLICATION_CREATED",
      message: "새로운 신청이 도착했습니다.",
      linkUrl: `/dashboard/creator/programs/demo-program-1/applications`,
    },
    create: {
      id: "demo-notif-2",
      userId,
      type: "APPLICATION_CREATED",
      message: "새로운 신청이 도착했습니다.",
      linkUrl: `/dashboard/creator/programs/demo-program-1/applications`,
      readAt: null, // 미읽음
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

// SPEC-007 NFR-003: 두 번째 커뮤니티 글 (크리에이터 작성 공지).
async function upsertCommunityPostSecond(creatorProfileId: string, authorId: string) {
  return prisma.communityPost.upsert({
    where: { id: "demo-community-2" },
    update: {},
    create: {
      id: "demo-community-2",
      creatorProfileId,
      authorId,
      title: "이번 주 작업 공지",
      content: "멤버 여러분께 드리는 두 번째 커뮤니티 공지입니다.",
    },
  });
}

// ──────────────────────────── 12. Review ────────────────────────────

// SPEC-008 NFR-004: COMPLETED 프로그램에 리뷰 2개를 추가해 크리에이터 평점이
// 빈 상태로 시작하지 않도록 한다 (rating 4, 5 → 평균 4.5).
async function upsertReviews(
  programs: Array<{ id: string; status: string }>,
  fans: Array<{ id: string }>,
) {
  const completed = programs.find((p) => p.status === "COMPLETED");
  if (!completed) return;
  await prisma.review.upsert({
    where: { id: "demo-review-1" },
    update: {},
    create: {
      id: "demo-review-1",
      programId: completed.id,
      userId: fans[0].id,
      rating: 4,
      comment: "체계적이고 유익했어요.",
      tags: ["구성이 알차요", "피드백이 유용해요"],
    },
  });
  await prisma.review.upsert({
    where: { id: "demo-review-2" },
    update: {},
    create: {
      id: "demo-review-2",
      programId: completed.id,
      userId: fans[1].id,
      rating: 5,
      comment: "정말 만족스럽습니다!",
      tags: ["소통이 좋아요", "다시 참여하고 싶어요"],
    },
  });
}

// ──────────────────────────── 13. Bookmark ────────────────────────────

// PRD §13.2: 팬의 관심 작가 북마크. 팬 역할은 자기 크리에이터 프로필이 없으므로
// 자기 북마크 제약(400)에 걸리지 않는다. 교차 북마크로 fan1/fan2 각각 목록이 채워진다.
async function upsertBookmarks(
  fans: Array<{ id: string }>,
  profiles: Array<{ id: string }>,
) {
  const pairs: Array<[string, string]> = [];
  if (fans[0] && profiles[1]) pairs.push([fans[0].id, profiles[1].id]);
  if (fans[1] && profiles[0]) pairs.push([fans[1].id, profiles[0].id]);
  await Promise.all(
    pairs.map(([fanId, creatorProfileId]) =>
      prisma.bookmark.upsert({
        where: { fanId_creatorProfileId: { fanId, creatorProfileId } },
        update: {},
        create: { fanId, creatorProfileId },
      }),
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
