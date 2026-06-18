# SPEC-010: AI 가격·혜택·프로그램 구성 추천

## 1. 개요

- **목적**: 크리에이터가 프로그램 생성 폼에 입력한 설명·운영 기간·카테고리·타깃 독자를 기반으로 AI가 가격, 혜택, 프로그램 구성(주차별), 추천 사유를 구조화된 JSON으로 제안한다. 크리에이터는 "추천 반영" 버튼 한 번으로 추천값을 폼에 적용할 수 있다.
- **배경**: PRD §4.2 P1 "AI 가격·혜택 추천 — 프로그램 설명 → 가격/혜택/운영 구성 추천", §8.7 "AI 추천 — POST /api/programs/ai-suggest", §1.4 RFP 변환표 "AI 단가 분석 → AI 가격·혜택·프로그램 구성 추천", Task 09.
- **범위**:
  - **포함**: AI 추천 요청 API 엔드포인트, OpenAI JSON Schema 호출(키 존재 시), 결정론적 Mock 폴백(키 누락 시), 추천 결과 카드 UI, "추천 반영" 버튼으로 SPEC-004 `Program` 생성 폼에 값 주입, 서버 사이드 키 보관.
  - **제외**: 추천 결과 영속화(히스토리), 추천 품질 A/B 평가, 클라이언트 사이드 OpenAI 직접 호출, 모델 파인튜닝, 프로그램 수정 화면에서의 재추천(초기 폼만).

## 2. 사용자 스토리

- As a **크리에이터**, I want **프로그램 설명과 기간, 카테고리, 타깃 독자를 입력해 AI 추천을 받고**, so that **합리적인 초기 가격·혜택·주차 구성을 빠르게 설정할 수 있다**.
- As a **크리에이터**, I want **"추천 반영" 버튼으로 가격과 혜택이 폼에 자동 입력되게**, so that **입력 중복을 줄이고 데모를 자연스럽게 이어갈 수 있다**.
- As a **발표자**, I want **OPENAI_API_KEY가 없는 데모 환경에서도 추천 기능이 실패 없이 동작하게**, so that **외부 키 유무와 무관하게 종단간 데모 흐름이 끊기지 않는다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`Program`** (`programs`): 추천값이 적용되는 최종 타깃. 본 SPEC은 추천 결과를 `Program` 생성 폼의 초기값(`priceKrw`, `description` 내 혜택/구성 텍스트)으로 주입한다. 실제 영속화는 SPEC-004의 `createProgram` 액션에서 처리된다.
- **추천 결과는 비영속(ephemeral)**: 별도의 Prisma 모델을 두지 않는다. 추천 JSON은 API 응답으로만 반환되며, 크리에이터가 "추천 반영"을 누르기 전까지 메모리/폼 상태에만 존재한다. 크리에이터가 폼을 제출하면 SPEC-004의 일반 `Program` 레코드로 저장된다.

### 스키마 보완

- **Prisma 스키마 변경**: 없음. `Program`의 기존 필드(`title`, `description`, `category`, `priceKrw`)로 충분하다.
- **`.env.example` 업데이트 (필수)**: `OPENAI_API_KEY=` 항목을 추가한다. `.env`는 커밋하지 않으며(PR Task 09, §9.2), `.env.example`만 저장소에 포함한다.

## 4. 기능 요구사항 (EARS)

- **FR-001**: WHEN 크리에이터가 프로그램 생성 폼에 `description`, `duration`(운영 기간), `category`, `targetAudience`를 입력하고 "AI 추천 받기" 버튼을 누르면, THE SYSTEM SHALL `POST /api/programs/ai-suggest`를 호출하고 PRD §8.7 형식의 JSON(`suggestedPrice`, `benefits[]`, `programStructure[]`, `reason`)을 반환해야 한다.
- **FR-002**: IF 환경 변수 `OPENAI_API_KEY`가 설정되어 있으면, THE SYSTEM SHALL OpenAI JSON Schema(구조화 응답)를 사용해 추천을 생성해야 한다. 응답은 반드시 §8.7 스키마를 만족해야 한다.
- **FR-003**: IF `OPENAI_API_KEY`가 누락되거나 빈 문자열이면, THE SYSTEM SHALL 결정론적(deterministic) Mock 응답을 반환해야 한다. 동일 입력에 대해 항상 동일한 추천값이 반환되어야 하며(입력 정규화 후 해시 기반 선택 권장), 데모가 실패하지 않아야 한다.
- **FR-004**: IF OpenAI 호출이 타임아웃(서버 설정 임계값, 기본 15초) 또는 네트워크/스키마 검증 실패로 끝나면, THE SYSTEM SHALL Mock 응답으로 폴백하고 추천 카드에 "AI 일시적 오류로 기본 추천을 표시합니다" 안내를 표시해야 한다 (요청 자체는 200으로 완료).
- **FR-005**: WHEN 크리에이터가 추천 결과 카드에서 "추천 반영" 버튼을 누르면, THE SYSTEM SHALL `suggestedPrice`를 폼의 `priceKrw` 필드에, `benefits[]`와 `programStructure[]`를 폼의 `description` 필드에 병합(또는 전용 UI 블록으로 표시)해야 한다. 추천 적용은 폼 상태만 갱신하고 즉시 DB 저장하지 않는다.
- **FR-006**: THE SYSTEM SHALL `OPENAI_API_KEY`를 서버 사이드에서만 읽고 접근해야 한다. 클라이언트 번들, `next_PUBLIC_*` 변수, 응답 바디, 에러 메시지 어디에도 키 값을 노출해서는 안 된다.
- **FR-007**: IF 비로그인 사용자 또는 팬(`role !== CREATOR`)이 `POST /api/programs/ai-suggest`를 호출하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-008**: WHEN API 응답을 클라이언트가 수신하면, THE SYSTEM SHALL `suggestedPrice`가 양의 정수(KRW), `benefits[]`가 비지 않은 문자열 배열, `programStructure[]`가 `{week: number, title: string, description: string}` 배열, `reason`이 문자열인지 검증하고 위반 시 FR-004 폴백으로 처리해야 한다.
- **FR-009**: WHILE 추천 요청이 진행 중이면, THE SYSTEM SHALL "AI 추천 생성 중..." 로딩 상태를 표시하고 "AI 추천 받기" 버튼을 비활성화해야 한다 (중복 요청 방지).

## 5. 비기능 요구사항

- **NFR-001 (데모 안정성)**: `OPENAI_API_KEY`가 없는 상태에서도 추천 API가 200 응답과 유효 JSON을 반환해야 한다. Mock 폴백은 데모 실패를 방지하는 최우선 보장 사항이다(PR Task 09 명시).
- **NFR-002 (보안)**: API 키는 서버 환경 변수로만 로드되며, Route Handler/Server Action 영역에서만 사용된다. 클라이언트 컴포넌트로 키를 전달하거나 `process.env.NEXT_PUBLIC_*`로 노출하지 않는다.
- **NFR-003 (성능)**: OpenAI 호출에는 타임아웃(기본 15초)을 적용하고, 초과 시 즉시 Mock 폴백하여 사용자 대기 시간을 bounded 상태로 유지한다.
- **NFR-004 (검증)**: AI/Mock 응답은 §8.7 JSON 스키마로 런타임 검증(zod 등)한다. 스키마 위반 시 폴백한다.
- **NFR-005 (결정성)**: Mock 경로는 동일 입력에 동일 출력을 반환해야 한다(데모 재현성, 테스트 안정성).

## 6. API / Server Action 명세

PRD §8.7 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| AI 추천 요청 | `suggestProgram` | POST | `/api/programs/ai-suggest` | 크리에이터 본인 | 입력: `{ description: string, duration?: string, category?: string, targetAudience?: string }` → 출력: `{ suggestedPrice: number, benefits: string[], programStructure: {week:number,title:string,description:string}[], reason: string }` |
| 추천 반영(폼 상태) | `applySuggestion` (client) | — | 폼 상태 갱신 함수 | 크리에이터 본인 | `suggestedPrice → form.priceKrw`, `benefits/programStructure → form.description`(병합). DB 호출 없음 |
| 최종 저장 | `createProgram` (SPEC-004) | POST | `/api/programs` | 크리에이터 본인 | 추천 반영된 폼 값을 일반 `Program` 생성 흐름으로 저장 — 본 SPEC에서 재정의하지 않음 |

- **Route Handler 위치(권장)**: `app/api/programs/ai-suggest/route.ts`. 핵심 로직은 `lib/ai/suggest.ts`에 분리(Route Handler는 입력 검증 + 권한 + 호출, `lib/ai/suggest.ts`가 OpenAI/Mock 분기 및 스키마 검증을 담당).
- **OpenAI 호출 위치**: `lib/ai/suggest.ts`의 `suggestWithOpenAI(input)` 함수. JSON Schema response_format 사용.
- **Mock 폴백 위치**: 동일 파일의 `suggestMock(input)` 함수. 입력 정규화 후 결정론적 매핑.

## 7. UI / 페이지

PRD §13.1 `/dashboard/creator` 하위 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/dashboard/creator/programs/new` | 크리에이터 본인 | `ProgramForm`(SPEC-004) 내에 `AiSuggestPanel` 임베드: `description`, `duration`, `category`, `targetAudience` 입력부 + "AI 추천 받기" 버튼 |
| (동일 페이지, 결과 카드) | 크리에이터 본인 | `AiSuggestionCard`: `suggestedPrice` 금액 표시, `benefits[]` 목록, `programStructure[]` 주차별 리스트, `reason` 텍스트, "추천 반영" / "닫기" 버튼 |
| `/dashboard/creator/programs/[id]/edit` | 크리에이터 본인 | 본 SPEC은 신규 생성 폼에만 추천 패널을 제공한다(편집 화면은 Won't) |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 크리에이터 A로 로그인 후, When A가 `description="4주 드로잉 챌린지"`, `duration="4주"`, `category="드로잉"`, `targetAudience="초심자"`를 입력하고 "AI 추천 받기"를 누르면, Then `POST /api/programs/ai-suggest`가 200 응답하고 본문이 `{suggestedPrice: number>0, benefits: string[](length>=1), programStructure: {week,title,description}[](length>=1), reason: string}` 형식이다.
- **AC-002**: Given 위 추천 결과가 표시된 상태에서, When A가 "추천 반영" 버튼을 누르면, Then 폼의 `priceKrw` 필드에 `suggestedPrice` 값이 입력되고, `description`(또는 전용 블록)에 `benefits[]`와 `programStructure[]`가 병합된다. 이 시점에 DB에는 아무 레코드도 생성되지 않는다.
- **AC-003**: Given `OPENAI_API_KEY`가 설정되지 않은 환경에서, When A가 "AI 추천 받기"를 누르면, Then API는 200을 반환하고 결정론적 Mock JSON을 내려주며, 동일 입력으로 두 번째 요청 시 동일 JSON이 반환된다.
- **AC-004**: Given `OPENAI_API_KEY`가 설정된 환경에서, When OpenAI 호출이 타임아웃/실패하면, Then API는 200과 함께 Mock 폴백 JSON을 반환하고 추천 카드에 "AI 일시적 오류로 기본 추천을 표시합니다" 안내가 표시된다.
- **AC-005**: Given 팬(B, `role=FAN`)이, When `POST /api/programs/ai-suggest`를 호출하면, Then 403이 반환된다.
- **AC-006**: Given 클라이언트 번들과 네트워크 응답을 검사할 때, When 추천 API 응답·에러 메시지·`NEXT_PUBLIC_*` 환경을 모두 확인하면, Then 어디에서도 `OPENAI_API_KEY` 값이 노출되지 않는다.
- **AC-007**: Given 추천 요청이 진행 중일 때, When 로딩 상태가 활성이면, Then "AI 추천 받기" 버튼은 비활성화되고 "AI 추천 생성 중..." 표시가 나타난다.
- **AC-008**: Given AI/Mock 응답이 스키마를 위반하는 경우(예: `suggestedPrice`가 음수, `benefits` 빈 배열), When 클라이언트/서버 검증이 실행되면, Then 폴백 응답으로 대체되거나 안전한 에러 처리로 요청이 종료된다(사용자에게 빈 카드나 깨진 UI가 노출되지 않음).
- **AC-009**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**:
  - SPEC-001 (Auth / Creator 역할 — FR-007 권한 검증의 기반).
  - SPEC-004 (Program CRUD — `ProgramForm` 호스트, `createProgram` 액션으로 최종 저장).
- **독립적 API 엔드포인트**: `/api/programs/ai-suggest`는 프로그램 생성 액션과 분리된 별도 Route Handler이며, SPEC-004의 `POST /api/programs`를 대체하거나 의존하지 않는다.
- **후행 SPEC**: 없음. 본 SPEC은 프로그램 생성 보조 기능으로 종료된다.

## 10. 제외 사항 (Won't)

- 추천 결과 영속화 / 추천 히스토리 조회 — 본 SPEC은 ephemeral 응답만 다룬다.
- 추천 품질 A/B 테스트 및 메트릭 수집.
- 실제 OpenAI 모델 파인튜닝 또는 자체 모델 학습.
- 클라이언트 사이드에서의 OpenAI 직접 호출 (키 노출 위험).
- 프로그램 편집 화면(`/programs/[id]/edit`)에서의 재추천 — 신규 생성 폼에만 패널 제공.
- 가격 외 필드(카테고리, 기간, 모집 인원)의 자동 반영 — 본 SPEC은 `priceKrw`와 `description`(혜택/구성)만 반영한다.
- 추천 사유(`reason`)의 다국어 처리 — PRD 예시(한국어)를 그대로 따른다.
