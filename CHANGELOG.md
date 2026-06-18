# Changelog

본 프로젝트의 주요 변경사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[유의적 버전](https://semver.org/lang/ko/) 0.x(개발 단계)으로 관리됩니다.

## [Unreleased]

### Added — SPEC-005: 팬 참여 신청·수락/거절 및 인앱 알림

- 팬의 프로그램 참여 신청 생성 — 중복 신청 차단(409), 자기 참조 금지, 모집 상태(`RECRUITING`)·모집 기한 검증.
- 크리에이터의 신청 수락/거절 — 단일 Prisma `$transaction`으로 상태 변경 + (옵션) 다른 대기 신청 자동 거절(`AUTO_REJECTED`) + 관련 알림 생성을 원자 처리(롤백 보장).
- 인앱 알림 자동 생성 — 신청/수락/거절/자동거절/모집마감 이벤트별 `Notification` 레코드.
- 알림 UI — `/notifications` 목록(미읽음 하이라이트, 클릭 시 읽음 + 링크 이동, 전체 읽음), 헤더 미읽음 배지(`NotificationBell`).
- 크리에이터 신청 관리 페이지 — `/dashboard/creator/programs/[id]/applications`(수락/거절 + 자동 거절 토글).
- REST API — `POST/GET /api/programs/:id/applications`, `PATCH /api/applications/:id`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
- Prisma 마이그레이션 `20260618232057_add_app_status_and_notif_link` — `ProgramApplicationStatus`에 `AUTO_REJECTED`/`CANCELLED` 추가, `notifications.link_url` 컬럼 추가(init 마이그레이션 누락분 보완).

### Changed

- `Program.updateProgram` — `status`가 `CLOSED`로 전이될 때 모든 `PENDING` 신청자에게 마감 알림 발송(best-effort).
- 시드 데이터 — 미읽음 알림(데모용) 추가.

### Notes

- 타깃 DB에 신규 마이그레이션 적용 필요: `npx prisma migrate deploy`.
