import {
  PrismaClient,
  Role,
  PostVisibility,
  ProgramApplicationStatus,
  ProgramStatus,
  PaymentStatus,
  SettlementStatus,
  ArtworkStatus,
  ArtworkOrderStatus,
  ArtworkIssueType,
  ArtworkIssueStatus,
  CreatorPayoutBusinessType,
  PayoutVerificationStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

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

// @MX:NOTE: SPEC-AUTH — 데모 계정 공통 비밀번호. seed 실행 시점에 1회 해시.
// 모든 시드 계정이 동일 비밀번호로 Credentials 로그인 가능하다.
const DEMO_PASSWORD = "demo1234!";
const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);
const ASSET_BASE = "/demo-assets";
type CreatorDemoKey =
  | "seo-yoon"
  | "min-jae"
  | "yu-ra"
  | "na-rin"
  | "i-jun"
  | "ga-eun"
  | "so-hee"
  | "tae-oh"
  | "ha-neul"
  | "ji-won";
const DEMO_CREATOR_KEYS: CreatorDemoKey[] = [
  "seo-yoon",
  "min-jae",
  "yu-ra",
  "na-rin",
  "i-jun",
  "ga-eun",
  "so-hee",
  "tae-oh",
  "ha-neul",
  "ji-won",
];

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
  await upsertCreatorWorks(profile.id, "seo-yoon");
  const artworks = await upsertArtworks(profile.id, "seo-yoon");

  // SPEC-002 NFR-001: 두 번째 크리에이터도 자체 plans/posts/programs 보유
  const profile2 = profiles[1];
  await upsertPlansFor(profile2.id, "demo2-plan-1");
  await upsertProgramsFor(profile2.id, "demo2-program-1");
  await upsertPostsFor(profile2.id, "demo2-post-1", "demo2-post-2");
  await upsertCreatorWorks(profile2.id, "min-jae");
  const artworks2 = await upsertArtworks(profile2.id, "min-jae");
  const extraArtworks: Array<{ id: string; priceKrw: number }> = [];
  for (let i = 2; i < profiles.length; i += 1) {
    const key = DEMO_CREATOR_KEYS[i];
    if (!key) continue;
    await upsertPlansForCreator(profiles[i].id, key);
    await upsertProgramsForCreator(profiles[i].id, key);
    await upsertPostsForCreator(profiles[i].id, key);
    await upsertCreatorWorks(profiles[i].id, key);
    extraArtworks.push(...(await upsertArtworks(profiles[i].id, key)));
  }
  await upsertPayoutAccounts(profiles);

  const membership = await upsertMembership(fans[0].id, plans[0].id);
  const acceptedApp = await upsertApplications(programs[0].id, fans);
  const contract = await upsertContract(acceptedApp.id);

  const payments = await upsertPayments(membership.id, contract.id, fans[0].id);
  await upsertSettlements(payments);
  await upsertArtworkOrders(fans, [...artworks, ...artworks2, ...extraArtworks]);

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
  await upsertHomepageReviews(profiles, fans);
  await upsertCommunityPost(profile.id, fans[0].id);
  // SPEC-007 NFR-003: 권한 사용자 관점에서 최소 2개의 커뮤니티 글이 보이도록 추가.
  // 두 번째 글은 크리에이터 본인이 작성한 공지 형태.
  await upsertCommunityPostSecond(profile.id, creators[0].id);

  // PRD §13.2: 팬의 관심 작가 북마크 — 교차로 1명씩 북마크해 목록이 비지 않도록 한다.
  await upsertBookmarks(fans, profiles);

  console.log("✓ Seed complete.");
  console.log(`  creators: ${creators.map((c) => c.email).join(", ")}`);
  console.log(`  fans: ${fans.map((f) => f.email).join(", ")}`);
  console.log(`  데모 비밀번호(모든 계정 공통): ${DEMO_PASSWORD}`);
}

// ──────────────────────────── 1. Users ────────────────────────────

// SPEC-001 AC-005: minimum 2 creators (each with a CreatorProfile) + 2 fans.
async function upsertCreators() {
  const defs = [
    { email: "creator@artbridge.demo", name: "이서윤" },
    { email: "creator2@artbridge.demo", name: "강민재" },
    { email: "creator3@artbridge.demo", name: "한유라" },
    { email: "creator4@artbridge.demo", name: "최나린" },
    { email: "creator5@artbridge.demo", name: "백이준" },
    { email: "creator6@artbridge.demo", name: "문가은" },
    { email: "creator7@artbridge.demo", name: "오소희" },
    { email: "creator8@artbridge.demo", name: "윤태오" },
    { email: "creator9@artbridge.demo", name: "김하늘" },
    { email: "creator10@artbridge.demo", name: "서지원" },
  ];
  return Promise.all(
    defs.map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: { name: d.name, passwordHash: DEMO_PASSWORD_HASH },
        create: {
          email: d.email,
          name: d.name,
          role: Role.CREATOR,
          passwordHash: DEMO_PASSWORD_HASH,
        },
      }),
    ),
  );
}

async function upsertFans() {
  const defs = [
    { email: "fan1@artbridge.demo", name: "정하린" },
    { email: "fan2@artbridge.demo", name: "박도윤" },
  ];
  return Promise.all(
    defs.map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: { name: d.name, passwordHash: DEMO_PASSWORD_HASH },
        create: {
          email: d.email,
          name: d.name,
          role: Role.FAN,
          passwordHash: DEMO_PASSWORD_HASH,
        },
      }),
    ),
  );
}

// ──────────────────────────── 2. CreatorProfile ────────────────────────────

// SPEC-002 NFR-001: 각 크리에이터 프로필에 5개 확장 필드 모두 채움.
const CREATOR_PROFILE_DEFS = [
  {
    studioName: "서윤 라이트 아틀리에",
    bio: "빛의 결, 투명한 안료, 얇은 레이어를 쌓아 도시의 오후를 회화와 오브제로 번역합니다.",
    category: "회화 · 설치",
    coverImageUrl: `${ASSET_BASE}/seo-yoon-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/seo-yoon-profile.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo",
    websiteUrl: "https://example.com/creator1",
  },
  {
    studioName: "민재 세라믹 스튜디오",
    bio: "흙, 유약, 금속 프레임을 조합해 손으로 만지는 조형과 생활 속 작은 설치물을 만듭니다.",
    category: "도예 · 조각",
    coverImageUrl: `${ASSET_BASE}/min-jae-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/min-jae-profile.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo2",
    websiteUrl: "https://example.com/creator2",
  },
  {
    studioName: "유라 포토룸",
    bio: "전시장, 사람의 움직임, 빛이 남긴 흔적을 사진과 아카이브 설치로 기록합니다.",
    category: "사진 · 전시",
    coverImageUrl: `${ASSET_BASE}/photo-gallery-walk-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/photo-gallery-walk-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo3",
    websiteUrl: "https://example.com/creator3",
  },
  {
    studioName: "나린 페인팅 랩",
    bio: "도시의 밤, 건축의 면, 색이 부딪히는 순간을 큰 캔버스 위에 재구성합니다.",
    category: "회화",
    coverImageUrl: `${ASSET_BASE}/painting-prism-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/painting-dusk-city-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo4",
    websiteUrl: "https://example.com/creator4",
  },
  {
    studioName: "이준 오브젝트 하우스",
    bio: "무광 도자, 목재 선반, 생활 오브제를 조합해 조용한 수집 장면을 만듭니다.",
    category: "도자 · 오브제",
    coverImageUrl: `${ASSET_BASE}/ceramic-stairs-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/ceramic-blue-vases-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo5",
    websiteUrl: "https://example.com/creator5",
  },
  {
    studioName: "가은 전시 그래픽 스튜디오",
    bio: "전시 포스터, 리서치 보드, 인쇄물과 공간 이미지를 연결하는 그래픽 작업을 합니다.",
    category: "그래픽 · 설치",
    coverImageUrl: `${ASSET_BASE}/exhibition-board-walk-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/exhibition-board-walk-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo6",
    websiteUrl: "https://example.com/creator6",
  },
  {
    studioName: "소희 텍스타일 룸",
    bio: "실, 천, 색실의 반복 패턴을 통해 벽에 걸리는 부드러운 조형과 생활 직물을 만듭니다.",
    category: "섬유 · 텍스타일",
    coverImageUrl: `${ASSET_BASE}/textile-weave-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/textile-weave-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo7",
    websiteUrl: "https://example.com/creator7",
  },
  {
    studioName: "태오 스톤 스컬프처",
    bio: "돌, 석고, 금속 베이스를 조합해 실내에 놓이는 조용한 조각을 제작합니다.",
    category: "조각",
    coverImageUrl: `${ASSET_BASE}/stone-sculpture-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/stone-sculpture-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo8",
    websiteUrl: "https://example.com/creator8",
  },
  {
    studioName: "하늘 잉크 페이퍼",
    bio: "종이 위의 먹 번짐과 여백을 연구하며 작은 드로잉과 수묵 기반 작업을 이어갑니다.",
    category: "드로잉 · 수묵",
    coverImageUrl: `${ASSET_BASE}/ink-paper-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/ink-paper-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo9",
    websiteUrl: "https://example.com/creator9",
  },
  {
    studioName: "지원 갤러리 에디션",
    bio: "전시장의 빛과 관람객의 움직임을 사진, 포스터, 소형 에디션으로 엮습니다.",
    category: "사진 · 에디션",
    coverImageUrl: `${ASSET_BASE}/gallery-evening-cover.jpg`,
    profileImageUrl: `${ASSET_BASE}/gallery-evening-portrait.jpg`,
    instagramUrl: "https://instagram.com/artbridge_demo10",
    websiteUrl: "https://example.com/creator10",
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
    {
      id: "demo-plan-1",
      title: "월간 작업실 노트",
      priceKrw: 5000,
      description: "작업 과정 사진, 재료 기록, 다음 공개작 미리보기를 매주 받아봅니다.",
    },
    {
      id: "demo-plan-2",
      title: "컬렉터 프리뷰",
      priceKrw: 12000,
      description: "신작 선공개, 멤버 전용 포스트, 소규모 온라인 크리틱에 참여합니다.",
    },
  ];
  return Promise.all(
    defs.map((d) =>
      prisma.membershipPlan.upsert({
        where: { id: d.id },
        update: {
          title: d.title,
          description: d.description,
          priceKrw: d.priceKrw,
        },
        create: { ...d, creatorProfileId },
      }),
    ),
  );
}

// ──────────────────────────── 4. Program ────────────────────────────

async function upsertPrograms(creatorProfileId: string) {
  return [
    await prisma.program.upsert({
      where: { id: "demo-program-1" },
      update: {
        title: "빛을 기록하는 아크릴 레이어링",
        description: "투명 아크릴 판과 색면을 겹쳐 작은 설치 회화를 완성하는 4주 프로그램입니다.",
        category: "온라인 클래스",
        priceKrw: 45000,
        maxParticipants: 10,
        status: ProgramStatus.IN_PROGRESS,
      },
      create: {
        id: "demo-program-1",
        creatorProfileId,
        title: "빛을 기록하는 아크릴 레이어링",
        description: "투명 아크릴 판과 색면을 겹쳐 작은 설치 회화를 완성하는 4주 프로그램입니다.",
        category: "온라인 클래스",
        priceKrw: 45000,
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
      update: {
        title: "작업실 컬러 리서치 워크숍",
        description: "개인 팔레트를 찾고 한 장의 색채 기록으로 정리한 지난 워크숍입니다.",
        category: "워크숍",
        priceKrw: 28000,
        maxParticipants: 8,
        status: ProgramStatus.COMPLETED,
      },
      create: {
        id: "demo-program-completed",
        creatorProfileId,
        title: "작업실 컬러 리서치 워크숍",
        description: "개인 팔레트를 찾고 한 장의 색채 기록으로 정리한 지난 워크숍입니다.",
        category: "워크숍",
        priceKrw: 28000,
        maxParticipants: 8,
        recruitDeadline: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: ProgramStatus.COMPLETED,
      },
    }),
  ];
}

// ──────────────────────────── 5. Post ────────────────────────────

async function upsertPosts(creatorProfileId: string) {
  const defs: Array<{
    id: string;
    title: string;
    body: string;
    visibility: PostVisibility;
    priceKrw: number | null;
  }> = [
    {
      id: "demo-post-1",
      title: "6월의 빛 샘플과 안료 테스트",
      body: "새 작업에 사용할 투명 안료와 반사 필름을 테스트했습니다. 오후 4시의 빛을 기준으로 색이 어떻게 바뀌는지 기록합니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo-post-2",
      title: "멤버에게 먼저 공개하는 신작 드로잉",
      body: "다음 전시의 출발점이 될 드로잉 5점을 정리했습니다. 멤버 피드백을 받고 최종 색면을 결정할 예정입니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
    {
      id: "demo-post-3",
      title: "컬렉터 노트: 작은 작품을 보관하는 법",
      body: "소형 회화와 오브제를 오래 보관하기 위한 조도, 습도, 액자 선택 기준을 정리했습니다.",
      visibility: PostVisibility.PAID,
      priceKrw: 5000,
    },
  ];
  return Promise.all(
    defs.map((d) =>
      prisma.post.upsert({
        where: { id: d.id },
        update: {
          title: d.title,
          body: d.body,
          visibility: d.visibility,
          priceKrw: d.priceKrw,
        },
        create: {
          id: d.id,
          creatorProfileId,
          title: d.title,
          body: d.body,
          visibility: d.visibility,
          priceKrw: d.priceKrw,
        },
      }),
    ),
  );
}

// ──────────────────────────── 5-1. CreatorWork / Artwork ────────────────────────────

async function upsertCreatorWorks(creatorProfileId: string, key: CreatorDemoKey) {
  const defs = CREATOR_WORK_DEFS[key] ?? [];

  return Promise.all(
    defs.map((d) =>
      prisma.creatorWork.upsert({
        where: { id: d.id },
        update: {
          title: d.title,
          kind: d.kind,
          description: d.description,
          imageUrl: d.imageUrl,
          startedAt: d.startedAt,
          endedAt: d.endedAt,
        },
        create: {
          ...d,
          creatorProfileId,
        },
      }),
    ),
  );
}

async function upsertArtworks(creatorProfileId: string, key: CreatorDemoKey) {
  const defs = ARTWORK_DEFS[key] ?? [];

  return Promise.all(
    defs.map((d) =>
      prisma.artwork.upsert({
        where: { id: d.id },
        update: {
          title: d.title,
          description: d.description,
          imageUrl: d.imageUrl,
          priceKrw: d.priceKrw,
          stock: d.stock,
          status: d.status,
        },
        create: {
          ...d,
          creatorProfileId,
        },
      }),
    ),
  );
}

const CREATOR_WORK_DEFS: Record<
  CreatorDemoKey,
  Array<{
    id: string;
    title: string;
    kind: string;
    description: string;
    imageUrl: string;
    startedAt: Date;
    endedAt: Date;
  }>
> = {
  "seo-yoon": [
    {
      id: "demo-work-seo-yoon-1",
      title: "라이트 룸 리서치",
      kind: "전시",
      description: "반투명 패널과 회화 레이어를 한 공간에 배치해 관람 동선에 따라 색이 변하는 설치 작업입니다.",
      imageUrl: `${ASSET_BASE}/work-light-room.jpg`,
      startedAt: new Date("2026-03-01"),
      endedAt: new Date("2026-05-18"),
    },
  ],
  "min-jae": [
    {
      id: "demo-work-min-jae-1",
      title: "세라믹 테이블 오브제",
      kind: "프로젝트",
      description: "손으로 빚은 작은 조형을 테이블 위에 놓이는 일상 오브제로 확장한 시리즈입니다.",
      imageUrl: `${ASSET_BASE}/work-ceramic-table.jpg`,
      startedAt: new Date("2026-02-10"),
      endedAt: new Date("2026-04-30"),
    },
    {
      id: "demo-work-min-jae-2",
      title: "계단 위의 무광 화병",
      kind: "촬영",
      description: "무광 흙색과 검은 유약의 대비를 자연광 아래에서 기록한 오브제 촬영입니다.",
      imageUrl: `${ASSET_BASE}/ceramic-stairs.jpg`,
      startedAt: new Date("2026-05-02"),
      endedAt: new Date("2026-05-20"),
    },
  ],
  "yu-ra": [
    {
      id: "demo-work-yu-ra-1",
      title: "화이트 월 포토 아카이브",
      kind: "사진전",
      description: "관람객의 움직임과 벽면 사진의 간격을 장노출 방식으로 기록한 전시 프로젝트입니다.",
      imageUrl: `${ASSET_BASE}/photo-gallery-walk.jpg`,
      startedAt: new Date("2026-01-15"),
      endedAt: new Date("2026-03-01"),
    },
  ],
  "na-rin": [
    {
      id: "demo-work-na-rin-1",
      title: "프리즘 시티 캔버스",
      kind: "개인전",
      description: "도시의 면과 빛을 큰 색면으로 분해한 회화 연작 전시입니다.",
      imageUrl: `${ASSET_BASE}/painting-prism.jpg`,
      startedAt: new Date("2026-04-01"),
      endedAt: new Date("2026-06-01"),
    },
  ],
  "i-jun": [
    {
      id: "demo-work-i-jun-1",
      title: "블루 글레이즈 스터디",
      kind: "작업실 기록",
      description: "청록 유약의 흐름과 유광 표면을 비교하기 위해 제작한 작은 화병 연구입니다.",
      imageUrl: `${ASSET_BASE}/ceramic-blue-vases.jpg`,
      startedAt: new Date("2026-02-18"),
      endedAt: new Date("2026-04-12"),
    },
  ],
  "ga-eun": [
    {
      id: "demo-work-ga-eun-1",
      title: "리서치 보드와 전시 그래픽",
      kind: "설치",
      description: "전시 리서치 이미지, 포스터, 컬러 샘플을 하나의 벽면 그래픽으로 구성했습니다.",
      imageUrl: `${ASSET_BASE}/exhibition-board-walk.jpg`,
      startedAt: new Date("2026-03-20"),
      endedAt: new Date("2026-05-10"),
    },
  ],
  "so-hee": [
    {
      id: "demo-work-so-hee-1",
      title: "색실과 벽면 패턴",
      kind: "텍스타일 설치",
      description: "서로 다른 굵기의 실과 천 조각을 벽면 패턴으로 배열한 부드러운 조형 작업입니다.",
      imageUrl: `${ASSET_BASE}/textile-weave.jpg`,
      startedAt: new Date("2026-04-05"),
      endedAt: new Date("2026-06-08"),
    },
  ],
  "tae-oh": [
    {
      id: "demo-work-tae-oh-1",
      title: "스톤 실내 조각",
      kind: "조각",
      description: "둥근 석고 형태와 낮은 베이스를 조합해 집 안에 놓이는 작은 조각을 제안합니다.",
      imageUrl: `${ASSET_BASE}/stone-sculpture.jpg`,
      startedAt: new Date("2026-03-12"),
      endedAt: new Date("2026-05-25"),
    },
  ],
  "ha-neul": [
    {
      id: "demo-work-ha-neul-1",
      title: "잉크 페이퍼 스터디",
      kind: "드로잉",
      description: "먹의 농도, 종이 섬유, 번짐의 속도를 비교한 작은 드로잉 연구입니다.",
      imageUrl: `${ASSET_BASE}/ink-paper.jpg`,
      startedAt: new Date("2026-02-04"),
      endedAt: new Date("2026-05-02"),
    },
  ],
  "ji-won": [
    {
      id: "demo-work-ji-won-1",
      title: "갤러리 이브닝 시리즈",
      kind: "사진",
      description: "늦은 오후 전시장 조명과 관람객의 실루엣을 포스터 에디션으로 구성했습니다.",
      imageUrl: `${ASSET_BASE}/gallery-evening.jpg`,
      startedAt: new Date("2026-05-01"),
      endedAt: new Date("2026-06-20"),
    },
  ],
};

const ARTWORK_DEFS: Record<
  CreatorDemoKey,
  Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    priceKrw: number;
    stock: number;
    status: ArtworkStatus;
  }>
> = {
  "seo-yoon": [
    {
      id: "demo-artwork-1",
      title: "오후의 잔상 01",
      description: "청록과 흰빛을 얇게 겹친 소형 회화 오브제입니다.",
      imageUrl: `${ASSET_BASE}/artwork-01.jpg`,
      priceKrw: 180000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-2",
      title: "투명한 창",
      description: "반사 필름과 안료 레이어가 보는 각도에 따라 달라지는 작품입니다.",
      imageUrl: `${ASSET_BASE}/artwork-03.jpg`,
      priceKrw: 260000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-3",
      title: "작은 빛의 지도",
      description: "컬렉터 프리뷰에서 먼저 공개했던 신작 에디션입니다.",
      imageUrl: `${ASSET_BASE}/artwork-04.jpg`,
      priceKrw: 145000,
      stock: 0,
      status: ArtworkStatus.SOLD,
    },
  ],
  "min-jae": [
    {
      id: "demo-artwork-4",
      title: "흙의 곡선",
      description: "유약의 흐름과 손자국을 그대로 남긴 세라믹 조각입니다.",
      imageUrl: `${ASSET_BASE}/artwork-02.jpg`,
      priceKrw: 220000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-5",
      title: "테이블 스톤",
      description: "책상 위에 놓는 작은 조형 오브제 시리즈입니다.",
      imageUrl: `${ASSET_BASE}/artwork-05.jpg`,
      priceKrw: 98000,
      stock: 3,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-6",
      title: "분홍 유약 테스트 피스",
      description: "멤버 전용 포스트에서 공개했던 유약 테스트 결과물입니다.",
      imageUrl: `${ASSET_BASE}/artwork-06.jpg`,
      priceKrw: 125000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "yu-ra": [
    {
      id: "demo-artwork-7",
      title: "화이트 월, 지나가는 사람",
      description: "전시장 벽면과 관람객의 흐릿한 움직임을 담은 사진 프린트입니다.",
      imageUrl: `${ASSET_BASE}/photo-gallery-walk.jpg`,
      priceKrw: 320000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-8",
      title: "아카이브 보드 02",
      description: "리서치 이미지와 색면 포스터가 겹친 전시 설치 사진입니다.",
      imageUrl: `${ASSET_BASE}/exhibition-board-walk.jpg`,
      priceKrw: 240000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-9",
      title: "갤러리 라인",
      description: "화이트 큐브 공간의 벽면, 액자, 걷는 사람의 시간을 담은 에디션입니다.",
      imageUrl: `${ASSET_BASE}/photo-gallery-walk-cover.jpg`,
      priceKrw: 190000,
      stock: 4,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "na-rin": [
    {
      id: "demo-artwork-10",
      title: "도시의 해질녘",
      description: "푸른 빌딩과 노란 창빛이 겹치는 시간을 색면으로 구성한 회화입니다.",
      imageUrl: `${ASSET_BASE}/painting-dusk-city.jpg`,
      priceKrw: 410000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-11",
      title: "프리즘 거리",
      description: "사선과 투명한 색면으로 도시의 진입로를 재구성한 캔버스입니다.",
      imageUrl: `${ASSET_BASE}/painting-prism.jpg`,
      priceKrw: 520000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-12",
      title: "창문 아래의 오렌지",
      description: "저녁 창빛과 어두운 골목의 대비를 작은 캔버스로 옮겼습니다.",
      imageUrl: `${ASSET_BASE}/painting-dusk-city-portrait.jpg`,
      priceKrw: 280000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "i-jun": [
    {
      id: "demo-artwork-13",
      title: "무광 화병 세트",
      description: "계단 위 자연광에서 촬영한 무광 도자 화병 세트입니다.",
      imageUrl: `${ASSET_BASE}/ceramic-stairs.jpg`,
      priceKrw: 360000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-14",
      title: "블루 글레이즈 듀오",
      description: "청록 유약이 흘러내리는 작은 화병 두 점 구성입니다.",
      imageUrl: `${ASSET_BASE}/ceramic-blue-vases.jpg`,
      priceKrw: 175000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-15",
      title: "검은 실린더 베이스",
      description: "무광 흑토와 얇은 입구 형태를 강조한 단독 오브제입니다.",
      imageUrl: `${ASSET_BASE}/ceramic-stairs-portrait.jpg`,
      priceKrw: 132000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "ga-eun": [
    {
      id: "demo-artwork-16",
      title: "오렌지 포스터 월",
      description: "전시 리서치 벽면에서 분리한 그래픽 포스터 프린트입니다.",
      imageUrl: `${ASSET_BASE}/exhibition-board-walk.jpg`,
      priceKrw: 88000,
      stock: 8,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-17",
      title: "리서치 카드 세트",
      description: "사진, 컬러 샘플, 짧은 메모를 엮은 한정판 인쇄물 세트입니다.",
      imageUrl: `${ASSET_BASE}/exhibition-board-walk-cover.jpg`,
      priceKrw: 64000,
      stock: 12,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-18",
      title: "화이트 큐브 스냅",
      description: "전시장 동선을 그래픽 레퍼런스로 기록한 사진 기반 포스터입니다.",
      imageUrl: `${ASSET_BASE}/photo-gallery-walk-portrait.jpg`,
      priceKrw: 72000,
      stock: 6,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "so-hee": [
    {
      id: "demo-artwork-19",
      title: "브릭 레드 위빙",
      description: "붉은색과 그린 톤의 실이 겹치는 벽걸이 텍스타일 작업입니다.",
      imageUrl: `${ASSET_BASE}/textile-weave.jpg`,
      priceKrw: 210000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-20",
      title: "패턴 샘플러 04",
      description: "여러 직조 밀도를 한 장에 모은 소형 섬유 샘플러입니다.",
      imageUrl: `${ASSET_BASE}/textile-weave-portrait.jpg`,
      priceKrw: 96000,
      stock: 5,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-21",
      title: "소프트 월 피스",
      description: "밝은 벽면에 걸기 좋은 패브릭 기반의 작은 오브제입니다.",
      imageUrl: `${ASSET_BASE}/textile-weave-cover.jpg`,
      priceKrw: 148000,
      stock: 3,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "tae-oh": [
    {
      id: "demo-artwork-22",
      title: "낮은 베이스의 돌",
      description: "둥근 석고 형태와 낮은 받침이 만나는 실내 조각입니다.",
      imageUrl: `${ASSET_BASE}/stone-sculpture.jpg`,
      priceKrw: 430000,
      stock: 1,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-23",
      title: "그레이 토르소",
      description: "부드러운 회색 덩어리감을 강조한 소형 조각 에디션입니다.",
      imageUrl: `${ASSET_BASE}/stone-sculpture-portrait.jpg`,
      priceKrw: 260000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-24",
      title: "베이스 스터디",
      description: "조각의 받침과 그림자까지 함께 설계한 연구작입니다.",
      imageUrl: `${ASSET_BASE}/stone-sculpture-cover.jpg`,
      priceKrw: 190000,
      stock: 2,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "ha-neul": [
    {
      id: "demo-artwork-25",
      title: "번지는 선 01",
      description: "물과 먹이 종이 위에서 만나는 순간을 남긴 드로잉입니다.",
      imageUrl: `${ASSET_BASE}/ink-paper.jpg`,
      priceKrw: 87000,
      stock: 7,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-26",
      title: "청록 먹 스터디",
      description: "차가운 청록 잉크와 여백이 대비되는 종이 작업입니다.",
      imageUrl: `${ASSET_BASE}/ink-paper-portrait.jpg`,
      priceKrw: 112000,
      stock: 4,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-27",
      title: "긴 여백",
      description: "가로로 긴 화면에 번짐의 리듬을 배열한 페이퍼 에디션입니다.",
      imageUrl: `${ASSET_BASE}/ink-paper-cover.jpg`,
      priceKrw: 132000,
      stock: 3,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
  "ji-won": [
    {
      id: "demo-artwork-28",
      title: "이브닝 갤러리 프린트",
      description: "전시장 조명과 관람객 실루엣을 담은 사진 프린트입니다.",
      imageUrl: `${ASSET_BASE}/gallery-evening.jpg`,
      priceKrw: 154000,
      stock: 4,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-29",
      title: "포스터 에디션 A",
      description: "갤러리 장면을 포스터 비율로 재구성한 한정판 인쇄물입니다.",
      imageUrl: `${ASSET_BASE}/gallery-evening-portrait.jpg`,
      priceKrw: 68000,
      stock: 10,
      status: ArtworkStatus.PUBLISHED,
    },
    {
      id: "demo-artwork-30",
      title: "벽면과 프레임",
      description: "화이트 큐브 공간의 프레임 배열을 기록한 가로형 사진입니다.",
      imageUrl: `${ASSET_BASE}/gallery-evening-cover.jpg`,
      priceKrw: 124000,
      stock: 5,
      status: ArtworkStatus.PUBLISHED,
    },
  ],
};

// ──────────────── SPEC-002 NFR-001: creator2 전용 plans/programs/posts ────────────────

async function upsertPlansFor(creatorProfileId: string, id: string) {
  const plan = {
    title: "세라믹 스케치 클럽",
    description: "유약 테스트, 소성 전후 기록, 테이블 오브제 제작 과정을 멤버 전용으로 공유합니다.",
    priceKrw: 9000,
  };
  return [
    await prisma.membershipPlan.upsert({
      where: { id },
      update: plan,
      create: {
        id,
        creatorProfileId,
        ...plan,
      },
    }),
  ];
}

async function upsertProgramsFor(creatorProfileId: string, id: string) {
  return [
    await prisma.program.upsert({
      where: { id },
      update: {
        title: "손바닥 조각과 유약 실험",
        description: "작은 도자 조각을 빚고, 표면 질감과 유약 조합을 실험하는 오프라인 워크숍입니다.",
        category: "오프라인 워크숍",
        priceKrw: 36000,
        maxParticipants: 8,
        status: ProgramStatus.RECRUITING,
      },
      create: {
        id,
        creatorProfileId,
        title: "손바닥 조각과 유약 실험",
        description: "작은 도자 조각을 빚고, 표면 질감과 유약 조합을 실험하는 오프라인 워크숍입니다.",
        category: "오프라인 워크숍",
        priceKrw: 36000,
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
    update: {
      title: "오늘의 유약 테스트 기록",
      body: "매트한 청록 유약과 철분이 많은 흙의 조합을 비교했습니다. 표면 질감이 예상보다 부드럽게 올라왔습니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    create: {
      id: publicId,
      creatorProfileId,
      title: "오늘의 유약 테스트 기록",
      body: "매트한 청록 유약과 철분이 많은 흙의 조합을 비교했습니다. 표면 질감이 예상보다 부드럽게 올라왔습니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
  });
  await prisma.post.upsert({
    where: { id: memberId },
    update: {
      title: "멤버 전용: 실패한 소성에서 배운 것",
      body: "이번 가마에서는 균열이 생긴 조각이 있었습니다. 원인과 다음 배치에서 바꿀 점을 자세히 남깁니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
    create: {
      id: memberId,
      creatorProfileId,
      title: "멤버 전용: 실패한 소성에서 배운 것",
      body: "이번 가마에서는 균열이 생긴 조각이 있었습니다. 원인과 다음 배치에서 바꿀 점을 자세히 남깁니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  });
}

async function upsertPlansForCreator(creatorProfileId: string, key: CreatorDemoKey) {
  const def = CREATOR_PLAN_DEFS[key];
  if (!def) return [];
  return [
    await prisma.membershipPlan.upsert({
      where: { id: def.id },
      update: {
        title: def.title,
        description: def.description,
        priceKrw: def.priceKrw,
      },
      create: {
        ...def,
        creatorProfileId,
      },
    }),
  ];
}

async function upsertProgramsForCreator(creatorProfileId: string, key: CreatorDemoKey) {
  const def = CREATOR_PROGRAM_DEFS[key];
  if (!def) return [];
  return [
    await prisma.program.upsert({
      where: { id: def.id },
      update: {
        title: def.title,
        description: def.description,
        category: def.category,
        priceKrw: def.priceKrw,
        maxParticipants: def.maxParticipants,
        status: ProgramStatus.RECRUITING,
      },
      create: {
        id: def.id,
        title: def.title,
        description: def.description,
        category: def.category,
        priceKrw: def.priceKrw,
        maxParticipants: def.maxParticipants,
        creatorProfileId,
        recruitDeadline: new Date(Date.now() + def.deadlineDays * 24 * 60 * 60 * 1000),
        status: ProgramStatus.RECRUITING,
      },
    }),
  ];
}

async function upsertPostsForCreator(creatorProfileId: string, key: CreatorDemoKey) {
  const defs = CREATOR_POST_DEFS[key] ?? [];
  await Promise.all(
    defs.map((d) =>
      prisma.post.upsert({
        where: { id: d.id },
        update: {
          title: d.title,
          body: d.body,
          visibility: d.visibility,
          priceKrw: d.priceKrw,
        },
        create: {
          ...d,
          creatorProfileId,
        },
      }),
    ),
  );
}

const CREATOR_PLAN_DEFS: Partial<Record<CreatorDemoKey, {
  id: string;
  title: string;
  description: string;
  priceKrw: number;
}>> = {
  "yu-ra": {
    id: "demo3-plan-1",
    title: "월간 포토 아카이브",
    description: "전시장 촬영 노트, 프린트 셀렉션, 다음 촬영 장소 후보를 먼저 받아봅니다.",
    priceKrw: 11000,
  },
  "na-rin": {
    id: "demo4-plan-1",
    title: "캔버스 컬러 로그",
    description: "색면 스터디, 팔레트 조합, 완성 전 캔버스 과정을 멤버 전용으로 공유합니다.",
    priceKrw: 13000,
  },
  "i-jun": {
    id: "demo5-plan-1",
    title: "오브제 컬렉터 노트",
    description: "도자 입고 일정, 유약 테스트, 소형 오브제 프리오더 소식을 먼저 확인합니다.",
    priceKrw: 10000,
  },
  "ga-eun": {
    id: "demo6-plan-1",
    title: "전시 그래픽 리서치",
    description: "포스터 시안, 리서치 보드, 인쇄 샘플 제작 과정을 받아봅니다.",
    priceKrw: 8000,
  },
  "so-hee": {
    id: "demo7-plan-1",
    title: "텍스타일 샘플 클럽",
    description: "새 실 조합, 패턴 샘플, 작은 패브릭 에디션 제작 과정을 공유합니다.",
    priceKrw: 9000,
  },
  "tae-oh": {
    id: "demo8-plan-1",
    title: "조각 스터디 노트",
    description: "형태 스케치, 재료 테스트, 설치 전 모형 사진을 먼저 받아봅니다.",
    priceKrw: 12000,
  },
  "ha-neul": {
    id: "demo9-plan-1",
    title: "잉크 페이퍼 월간지",
    description: "드로잉 과정, 종이 추천, 먹 농도 실험 기록을 매달 모아 전합니다.",
    priceKrw: 7000,
  },
  "ji-won": {
    id: "demo10-plan-1",
    title: "포토 에디션 프리뷰",
    description: "전시장 촬영 컷, 포스터 시안, 다음 프린트 후보를 먼저 볼 수 있습니다.",
    priceKrw: 8500,
  },
};

const CREATOR_PROGRAM_DEFS: Partial<Record<CreatorDemoKey, {
  id: string;
  title: string;
  description: string;
  category: string;
  priceKrw: number;
  maxParticipants: number;
  deadlineDays: number;
}>> = {
  "yu-ra": {
    id: "demo3-program-1",
    title: "전시장 사진 읽기와 시퀀싱",
    description: "전시장 사진을 고르고 순서를 짜서 작은 포토북 흐름으로 구성하는 클래스입니다.",
    category: "사진 클래스",
    priceKrw: 42000,
    maxParticipants: 12,
    deadlineDays: 24,
  },
  "na-rin": {
    id: "demo4-program-1",
    title: "도시 색면 페인팅 워크숍",
    description: "사진 한 장에서 색면을 추출해 추상 회화 스케치로 옮기는 3주 워크숍입니다.",
    category: "회화 워크숍",
    priceKrw: 58000,
    maxParticipants: 9,
    deadlineDays: 18,
  },
  "i-jun": {
    id: "demo5-program-1",
    title: "작은 화병 형태 만들기",
    description: "기본 성형과 표면 질감 정리를 통해 손바닥 크기의 화병을 제작합니다.",
    category: "도예 워크숍",
    priceKrw: 52000,
    maxParticipants: 7,
    deadlineDays: 20,
  },
  "ga-eun": {
    id: "demo6-program-1",
    title: "전시 포스터 무드보드 만들기",
    description: "이미지, 타이포, 컬러 샘플을 조합해 전시 포스터 방향을 잡는 온라인 클래스입니다.",
    category: "그래픽 클래스",
    priceKrw: 33000,
    maxParticipants: 14,
    deadlineDays: 28,
  },
  "so-hee": {
    id: "demo7-program-1",
    title: "작은 직조 샘플 만들기",
    description: "색실을 고르고 반복 패턴을 짜서 벽에 걸 수 있는 작은 샘플을 완성합니다.",
    category: "텍스타일 워크숍",
    priceKrw: 39000,
    maxParticipants: 10,
    deadlineDays: 25,
  },
  "tae-oh": {
    id: "demo8-program-1",
    title: "실내 조각 형태 스터디",
    description: "석고와 점토로 작은 조각의 덩어리, 받침, 그림자까지 설계합니다.",
    category: "조각 워크숍",
    priceKrw: 61000,
    maxParticipants: 8,
    deadlineDays: 22,
  },
  "ha-neul": {
    id: "demo9-program-1",
    title: "먹 번짐과 여백 드로잉",
    description: "종이와 물의 양을 바꿔가며 번짐을 제어하고 작은 연작을 만듭니다.",
    category: "드로잉 클래스",
    priceKrw: 28000,
    maxParticipants: 16,
    deadlineDays: 19,
  },
  "ji-won": {
    id: "demo10-program-1",
    title: "사진을 포스터 에디션으로",
    description: "전시장 사진을 고르고 크롭, 여백, 캡션을 정리해 포스터 에디션으로 구성합니다.",
    category: "사진 · 그래픽",
    priceKrw: 36000,
    maxParticipants: 12,
    deadlineDays: 27,
  },
};

const CREATOR_POST_DEFS: Partial<Record<CreatorDemoKey, Array<{
  id: string;
  title: string;
  body: string;
  visibility: PostVisibility;
  priceKrw: number | null;
}>>> = {
  "yu-ra": [
    {
      id: "demo3-post-1",
      title: "전시장 사진을 고르는 기준",
      body: "관람객의 움직임, 벽면의 여백, 액자 간격이 함께 보이는 컷을 우선으로 고릅니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo3-post-2",
      title: "멤버 프린트 후보 6장",
      body: "다음 에디션으로 제작할 사진 후보와 인화지 테스트 결과를 공유합니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  ],
  "na-rin": [
    {
      id: "demo4-post-1",
      title: "프리즘 회화의 첫 색면",
      body: "큰 면을 먼저 잡고 작은 창빛을 나중에 얹는 방식으로 도시의 깊이를 만듭니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo4-post-2",
      title: "유료 노트: 캔버스 레이어 순서",
      body: "밑색, 중간 투명층, 마지막 강조색을 쌓는 순서를 실제 작업 사진과 함께 정리했습니다.",
      visibility: PostVisibility.PAID,
      priceKrw: 6000,
    },
  ],
  "i-jun": [
    {
      id: "demo5-post-1",
      title: "무광 화병의 표면 질감",
      body: "사포질과 건조 시간에 따라 같은 흙도 완전히 다른 표정을 가집니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo5-post-2",
      title: "멤버 전용: 유약 실패 기록",
      body: "청록 유약이 과하게 흘렀던 배치와 다음 소성에서 조정할 포인트를 남깁니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  ],
  "ga-eun": [
    {
      id: "demo6-post-1",
      title: "전시 보드에 이미지를 배열하는 법",
      body: "크기가 다른 이미지와 컬러 샘플을 한 벽면에서 읽히게 만드는 간격 기준을 공유합니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo6-post-2",
      title: "리서치 카드 인쇄 전 체크리스트",
      body: "종이 두께, 여백, 작은 캡션의 가독성을 확인하는 프린트 체크리스트입니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  ],
  "so-hee": [
    {
      id: "demo7-post-1",
      title: "실 색을 고를 때 보는 세 가지",
      body: "같은 붉은색도 광택, 꼬임, 주변색에 따라 완전히 다르게 보입니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo7-post-2",
      title: "멤버 전용: 패턴 샘플 도안",
      body: "이번 달 샘플 클럽에서 사용할 반복 패턴 도안과 실 조합표입니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  ],
  "tae-oh": [
    {
      id: "demo8-post-1",
      title: "작은 조각의 받침을 정하는 법",
      body: "조각 자체만큼 그림자와 받침 높이가 공간의 인상을 크게 바꿉니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo8-post-2",
      title: "유료 노트: 석고 표면 마감",
      body: "사포 번호와 코팅 순서에 따른 표면 차이를 실제 테스트 사진과 함께 정리했습니다.",
      visibility: PostVisibility.PAID,
      priceKrw: 7000,
    },
  ],
  "ha-neul": [
    {
      id: "demo9-post-1",
      title: "먹이 번지는 속도를 늦추는 방법",
      body: "종이 수분과 붓의 물 양을 조절하면 같은 선도 더 오래 머무릅니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo9-post-2",
      title: "멤버 전용: 종이별 테스트 표",
      body: "세 종류의 종이에 같은 농도의 먹을 올려 번짐과 마름 시간을 비교했습니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  ],
  "ji-won": [
    {
      id: "demo10-post-1",
      title: "사진을 포스터로 바꾸는 첫 크롭",
      body: "사진의 정보량을 줄이고 여백을 확보하면 작은 포스터에서도 장면이 또렷해집니다.",
      visibility: PostVisibility.PUBLIC,
      priceKrw: null,
    },
    {
      id: "demo10-post-2",
      title: "멤버 전용: 에디션 넘버링 기준",
      body: "프린트 크기, 종이, 보관 봉투까지 포함한 에디션 제작 기준을 공유합니다.",
      visibility: PostVisibility.MEMBER_ONLY,
      priceKrw: null,
    },
  ],
};

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
  // SPEC-013 에스크로 데모: demo-app-1은 결제 완료(PAID) 후 크리에이터가 납품 요청한 상태.
  // deliveryRequestedAt 세팅 → 팬(fans[0])에게 "완료 승인 대기" 배지 + ApproveCompletionButton 노출.
  // update에도 명시 — 재시드 시 납품 요청 상태가 보존된다.
  const deliveryRequestedAt = new Date();
  await prisma.programApplication.upsert({
    where: { id: "demo-app-1" },
    update: { deliveryRequestedAt },
    create: {
      id: "demo-app-1",
      programId,
      userId: fans[0].id,
      status: ProgramApplicationStatus.ACCEPTED,
      deliveryRequestedAt,
    },
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

// ──────────────────────────── 10-1. ArtworkOrder / Shipment / Issue ────────────────────────────

async function upsertArtworkOrders(
  fans: Array<{ id: string }>,
  artworks: Array<{ id: string; priceKrw: number }>,
) {
  const byId = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const firstArtwork = byId.get("demo-artwork-1");
  const secondArtwork = byId.get("demo-artwork-4");
  if (!fans[0] || !fans[1] || !firstArtwork || !secondArtwork) return;

  const order1 = await prisma.artworkOrder.upsert({
    where: { id: "demo-artwork-order-1" },
    update: {
      status: ArtworkOrderStatus.SHIPPED,
      recipientName: "정하린",
      recipientPhone: "010-1234-5678",
      shippingAddress: "서울시 성동구 아트브릿지로 24",
      shippingMemo: "경비실에 맡겨주세요.",
      itemAmount: firstArtwork.priceKrw,
      shippingFeeKrw: 3000,
      totalAmount: firstArtwork.priceKrw + 3000,
      paidAt: new Date(),
    },
    create: {
      id: "demo-artwork-order-1",
      artworkId: firstArtwork.id,
      fanUserId: fans[0].id,
      status: ArtworkOrderStatus.SHIPPED,
      recipientName: "정하린",
      recipientPhone: "010-1234-5678",
      shippingAddress: "서울시 성동구 아트브릿지로 24",
      shippingMemo: "경비실에 맡겨주세요.",
      itemAmount: firstArtwork.priceKrw,
      shippingFeeKrw: 3000,
      totalAmount: firstArtwork.priceKrw + 3000,
      paidAt: new Date(),
    },
  });

  await prisma.artworkShipment.upsert({
    where: { orderId: order1.id },
    update: {
      carrier: "CJ대한통운",
      trackingNo: "581234567890",
      shippedAt: new Date(),
      deliveredAt: null,
    },
    create: {
      orderId: order1.id,
      carrier: "CJ대한통운",
      trackingNo: "581234567890",
      shippedAt: new Date(),
      deliveredAt: null,
    },
  });

  const order2 = await prisma.artworkOrder.upsert({
    where: { id: "demo-artwork-order-2" },
    update: {
      status: ArtworkOrderStatus.ISSUE_OPENED,
      recipientName: "박도윤",
      recipientPhone: "010-9876-5432",
      shippingAddress: "부산시 수영구 갤러리길 12",
      shippingMemo: "문 앞에 놓아주세요.",
      itemAmount: secondArtwork.priceKrw,
      shippingFeeKrw: 3000,
      totalAmount: secondArtwork.priceKrw + 3000,
      paidAt: new Date(),
    },
    create: {
      id: "demo-artwork-order-2",
      artworkId: secondArtwork.id,
      fanUserId: fans[1].id,
      status: ArtworkOrderStatus.ISSUE_OPENED,
      recipientName: "박도윤",
      recipientPhone: "010-9876-5432",
      shippingAddress: "부산시 수영구 갤러리길 12",
      shippingMemo: "문 앞에 놓아주세요.",
      itemAmount: secondArtwork.priceKrw,
      shippingFeeKrw: 3000,
      totalAmount: secondArtwork.priceKrw + 3000,
      paidAt: new Date(),
    },
  });

  await prisma.artworkOrderIssue.upsert({
    where: { id: "demo-artwork-issue-1" },
    update: {
      type: ArtworkIssueType.NOT_AS_DESCRIBED,
      status: ArtworkIssueStatus.REVIEWING,
      message: "작품 표면 색감이 상세 이미지보다 어둡게 보여 확인을 요청했습니다.",
      imageUrl: `${ASSET_BASE}/artwork-02.jpg`,
    },
    create: {
      id: "demo-artwork-issue-1",
      orderId: order2.id,
      userId: fans[1].id,
      type: ArtworkIssueType.NOT_AS_DESCRIBED,
      status: ArtworkIssueStatus.REVIEWING,
      message: "작품 표면 색감이 상세 이미지보다 어둡게 보여 확인을 요청했습니다.",
      imageUrl: `${ASSET_BASE}/artwork-02.jpg`,
    },
  });

  await Promise.all([
    upsertArtworkPayment("demo-artwork-payment-1", order1.id, fans[0].id, order1.totalAmount),
    upsertArtworkPayment("demo-artwork-payment-2", order2.id, fans[1].id, order2.totalAmount),
  ]);
}

async function upsertArtworkPayment(
  id: string,
  artworkOrderId: string,
  fanUserId: string,
  amount: number,
) {
  const feeKrw = Math.round(amount * FEE_RATE);
  const payment = await prisma.payment.upsert({
    where: { id },
    update: {
      artworkOrderId,
      fanUserId,
      amount,
      feeKrw,
      status: PaymentStatus.PAID,
      provider: "mock",
      providerTxId: `${id}-tx`,
      merchantUid: `${id}-merchant`,
    },
    create: {
      id,
      artworkOrderId,
      fanUserId,
      amount,
      feeKrw,
      status: PaymentStatus.PAID,
      provider: "mock",
      providerTxId: `${id}-tx`,
      merchantUid: `${id}-merchant`,
    },
  });
  await prisma.settlement.upsert({
    where: { paymentId: payment.id },
    update: {
      sourceType: "ARTWORK_ORDER",
      sourceId: artworkOrderId,
      grossAmount: amount,
      feeKrw,
      payout: amount - feeKrw,
      status: SettlementStatus.AVAILABLE,
      availableAt: new Date(),
    },
    create: {
      paymentId: payment.id,
      sourceType: "ARTWORK_ORDER",
      sourceId: artworkOrderId,
      grossAmount: amount,
      feeKrw,
      payout: amount - feeKrw,
      status: SettlementStatus.AVAILABLE,
      availableAt: new Date(),
    },
  });
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
    update: {
      title: "이번 주 멤버 피드백 스레드",
      content: "신작 드로잉의 색면 조합을 고르는 중입니다. 마음에 드는 팔레트와 이유를 댓글로 남겨주세요.",
    },
    create: {
      id: "demo-community-1",
      creatorProfileId,
      authorId,
      title: "이번 주 멤버 피드백 스레드",
      content: "신작 드로잉의 색면 조합을 고르는 중입니다. 마음에 드는 팔레트와 이유를 댓글로 남겨주세요.",
    },
  });
}

// SPEC-007 NFR-003: 두 번째 커뮤니티 글 (크리에이터 작성 공지).
async function upsertCommunityPostSecond(creatorProfileId: string, authorId: string) {
  return prisma.communityPost.upsert({
    where: { id: "demo-community-2" },
    update: {
      title: "7월 온라인 오픈스튜디오 안내",
      content: "멤버십 참여자를 대상으로 7월 첫째 주 온라인 오픈스튜디오를 엽니다. 작업 과정과 보관 팁을 함께 나눌 예정입니다.",
    },
    create: {
      id: "demo-community-2",
      creatorProfileId,
      authorId,
      title: "7월 온라인 오픈스튜디오 안내",
      content: "멤버십 참여자를 대상으로 7월 첫째 주 온라인 오픈스튜디오를 엽니다. 작업 과정과 보관 팁을 함께 나눌 예정입니다.",
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
  // SPEC-013: 양방향 평가 — 팬→크리에이터 리뷰의 피평가자는 프로그램 소유 크리에이터.
  const owner = await prisma.program.findUnique({
    where: { id: completed.id },
    select: { creatorProfile: { select: { userId: true } } },
  });
  const revieweeId = owner?.creatorProfile?.userId;
  if (!revieweeId) return;
  await prisma.review.upsert({
    where: { id: "demo-review-1" },
    update: {
      rating: 4,
      comment: "재료 선택 이유를 차근차근 설명해줘서 내 작업에도 바로 적용할 수 있었어요.",
      tags: ["구성이 알차요", "피드백이 유용해요"],
    },
    create: {
      id: "demo-review-1",
      programId: completed.id,
      userId: fans[0].id,
      revieweeId,
      rating: 4,
      comment: "재료 선택 이유를 차근차근 설명해줘서 내 작업에도 바로 적용할 수 있었어요.",
      tags: ["구성이 알차요", "피드백이 유용해요"],
    },
  });
  await prisma.review.upsert({
    where: { id: "demo-review-2" },
    update: {
      rating: 5,
      comment: "온라인인데도 작업실에 같이 있는 느낌이 들었고, 피드백이 매우 구체적이었습니다.",
      tags: ["소통이 좋아요", "다시 참여하고 싶어요"],
    },
    create: {
      id: "demo-review-2",
      programId: completed.id,
      userId: fans[1].id,
      revieweeId,
      rating: 5,
      comment: "온라인인데도 작업실에 같이 있는 느낌이 들었고, 피드백이 매우 구체적이었습니다.",
      tags: ["소통이 좋아요", "다시 참여하고 싶어요"],
    },
  });
}

async function upsertHomepageReviews(
  profiles: Array<{ id: string; userId: string }>,
  fans: Array<{ id: string }>,
) {
  const completed = await prisma.program.findUnique({
    where: { id: "demo-program-completed" },
    select: { id: true },
  });
  if (!completed) return;

  const ratings = [
    { keyIndex: 1, rating: 5, comment: "작품 설명이 섬세하고 실제 컬렉션 선택에 도움이 됐어요." },
    { keyIndex: 2, rating: 5, comment: "사진을 읽는 관점이 새로웠고 전시 동선까지 이해하게 됐습니다." },
    { keyIndex: 3, rating: 5, comment: "색면을 나누는 기준이 명확해서 작업을 보는 재미가 커졌어요." },
    { keyIndex: 4, rating: 4, comment: "도자 오브제를 고르는 기준을 친절하게 알려줘서 좋았습니다." },
    { keyIndex: 5, rating: 5, comment: "전시 그래픽이 만들어지는 과정을 실제처럼 배울 수 있었어요." },
    { keyIndex: 6, rating: 4, comment: "직조 샘플 설명이 구체적이고 색 조합이 아름다웠습니다." },
    { keyIndex: 7, rating: 5, comment: "조각의 받침과 그림자를 함께 보는 관점이 인상 깊었어요." },
    { keyIndex: 8, rating: 4, comment: "먹과 종이를 다루는 작은 차이를 쉽게 이해했습니다." },
    { keyIndex: 9, rating: 5, comment: "사진 프린트와 포스터 제작 흐름이 선명하게 잡혔습니다." },
  ];

  await Promise.all(
    ratings.flatMap((item, index) => {
      const profile = profiles[item.keyIndex];
      if (!profile) return [];
      return fans.slice(0, 2).map((fan, fanIndex) =>
        prisma.review.upsert({
          where: { id: `demo-home-review-${index + 1}-${fanIndex + 1}` },
          update: {
            programId: completed.id,
            userId: fan.id,
            revieweeId: profile.userId,
            rating: fanIndex === 0 ? item.rating : Math.max(4, item.rating - 1),
            comment: item.comment,
            tags: fanIndex === 0 ? ["설명이 좋아요", "다시 보고 싶어요"] : ["작품이 좋아요", "추천해요"],
          },
          create: {
            id: `demo-home-review-${index + 1}-${fanIndex + 1}`,
            programId: completed.id,
            userId: fan.id,
            revieweeId: profile.userId,
            rating: fanIndex === 0 ? item.rating : Math.max(4, item.rating - 1),
            comment: item.comment,
            tags: fanIndex === 0 ? ["설명이 좋아요", "다시 보고 싶어요"] : ["작품이 좋아요", "추천해요"],
          },
        }),
      );
    }),
  );
}

// ──────────────────────────── 12-1. CreatorPayoutAccount ────────────────────────────

async function upsertPayoutAccounts(profiles: Array<{ id: string }>) {
  const defs = [
    {
      creatorProfileId: profiles[0]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "신한은행",
      accountHolder: "이서윤",
      accountNumberMasked: "110-***-**4821",
      accountNumberLast4: "4821",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
    {
      creatorProfileId: profiles[1]?.id,
      businessType: CreatorPayoutBusinessType.SOLE_PROPRIETOR,
      bankName: "국민은행",
      accountHolder: "강민재",
      accountNumberMasked: "004-***-**9173",
      accountNumberLast4: "9173",
      businessRegistrationNo: "123-45-67890",
      verificationStatus: PayoutVerificationStatus.PENDING_VERIFICATION,
      verifiedAt: null,
    },
    {
      creatorProfileId: profiles[2]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "하나은행",
      accountHolder: "한유라",
      accountNumberMasked: "391-***-**2044",
      accountNumberLast4: "2044",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
    {
      creatorProfileId: profiles[3]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "우리은행",
      accountHolder: "최나린",
      accountNumberMasked: "1002-***-**7710",
      accountNumberLast4: "7710",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
    {
      creatorProfileId: profiles[4]?.id,
      businessType: CreatorPayoutBusinessType.SOLE_PROPRIETOR,
      bankName: "토스뱅크",
      accountHolder: "백이준",
      accountNumberMasked: "1908-***-**5582",
      accountNumberLast4: "5582",
      businessRegistrationNo: "234-56-78901",
      verificationStatus: PayoutVerificationStatus.PENDING_VERIFICATION,
      verifiedAt: null,
    },
    {
      creatorProfileId: profiles[5]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "카카오뱅크",
      accountHolder: "문가은",
      accountNumberMasked: "3333-***-**6407",
      accountNumberLast4: "6407",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
    {
      creatorProfileId: profiles[6]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "신한은행",
      accountHolder: "오소희",
      accountNumberMasked: "088-***-**3371",
      accountNumberLast4: "3371",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
    {
      creatorProfileId: profiles[7]?.id,
      businessType: CreatorPayoutBusinessType.SOLE_PROPRIETOR,
      bankName: "기업은행",
      accountHolder: "윤태오",
      accountNumberMasked: "020-***-**5928",
      accountNumberLast4: "5928",
      businessRegistrationNo: "345-67-89012",
      verificationStatus: PayoutVerificationStatus.PENDING_VERIFICATION,
      verifiedAt: null,
    },
    {
      creatorProfileId: profiles[8]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "농협은행",
      accountHolder: "김하늘",
      accountNumberMasked: "302-***-**8460",
      accountNumberLast4: "8460",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
    {
      creatorProfileId: profiles[9]?.id,
      businessType: CreatorPayoutBusinessType.PERSONAL,
      bankName: "케이뱅크",
      accountHolder: "서지원",
      accountNumberMasked: "700-***-**2186",
      accountNumberLast4: "2186",
      businessRegistrationNo: null,
      verificationStatus: PayoutVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
  ].filter((d): d is Exclude<typeof d, { creatorProfileId: undefined }> => Boolean(d.creatorProfileId));

  await Promise.all(
    defs.map((d) =>
      prisma.creatorPayoutAccount.upsert({
        where: { creatorProfileId: d.creatorProfileId },
        update: {
          businessType: d.businessType,
          bankName: d.bankName,
          accountHolder: d.accountHolder,
          accountNumberMasked: d.accountNumberMasked,
          accountNumberLast4: d.accountNumberLast4,
          businessRegistrationNo: d.businessRegistrationNo,
          verificationStatus: d.verificationStatus,
          verifiedAt: d.verifiedAt,
        },
        create: d,
      }),
    ),
  );
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
