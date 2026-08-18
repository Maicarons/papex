# API

Papex는 `/api` 아래에 일련의 JSON HTTP API를 노출합니다.

## 대화형 참조

완전하고 기계가 읽을 수 있는 **OpenAPI 3.1** 명세는 [`/api/openapi.json`](/api/openapi.json)에서 제공되며, 대화형 Try-it 탐색기([Scalar](https://scalar.com) 기반)는 **[/api-docs](/api-docs)**에서 사용할 수 있습니다. 열어서 모든 엔드포인트를 탐색하고 요청·응답 스키마를 확인하며 브라우저에서 실시간 요청을 보내세요.

## 문서 동기화 유지 (코드 우선)

OpenAPI 문서는 **코드에서 생성**되며 손으로 작성되지 않습니다. 각 라우트는 해당 엔드포인트 문서의 유일한 출처인 형제 프래그먼트 `route.openapi.ts`를 갖습니다. 정적 부분(info, `components/schemas`, `components/responses`, security)은 `src/lib/openapi/base.ts`에 있습니다.

생성기(`src/lib/openapi/generate.ts`)는 모든 프래그먼트를 스캔해 기본에 병합하고 `/api/openapi.json`이 제공하는 `src/lib/openapi/spec.generated.ts`를 작성합니다.

```bash
# 프래그먼트 수정 후 재생성 (/api/openapi.json + /api-docs 갱신)
npm run openapi:generate
```

이것은 `predev`와 `prebuild`에 연결되어, `next dev` / `next build` 전에 항상 명세가 재구성됩니다. **`spec.generated.ts`를 절대 손으로 편집하지 마세요** — 매 실행 시 덮어쓰입니다.

### 새 엔드포인트 문서화

라우트 핸들러 `src/app/api/foo/bar/route.ts`를 추가할 때 형제 `route.openapi.ts`를 만드세요:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "무엇을 하는지 설명",
      // security: []            // 공개 엔드포인트는 생략
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

`npm run openapi:generate`(또는 그냥 시작/빌드)를 실행하면 엔드포인트가 `/api/openapi.json`과 `/api-docs`에 자동으로 나타납니다. 공유 스키마는 `src/lib/openapi/base.ts`에 있습니다 (예: `#/components/schemas/PaperListItem`).

## 인증

인증 방법은 두 가지입니다:

1. **세션 쿠키** (`papex_session`) — 로그인 시 발급되어 브라우저가 사용. 동일 출처 요청에 자동 전송.
2. **API 키** (`Authorization: Bearer pk_…`) — 스크립트 및 서드파티 통합용. **설정 → API 키**
   (`/settings/api-keys`)에서 키 생성. 키는 계정에 묶이고 역할의 RBAC 권한을 상속하므로, 세션 쿠키로 동작하는 모든 엔드포인트는 API 키로도 동작합니다. 원본 비밀은 생성 시 **한 번만** 표시되며 SHA-256 해시만 저장됩니다.

API 키를 사용한 요청 예:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

공개(인증 없음) 엔드포인트 — 논문 목록, 검색, 분류, 저자, 헬스 등 — 익명 호출자, 세션 쿠키, API 키 모두에 동일하게 동작합니다.

## 인증 (Auth)

- `POST /api/auth/register` — 가입 `{username, email, displayName, password}`
- `POST /api/auth/login` — 로그인 `{identifier, password}`
- `POST /api/auth/logout` — 로그아웃
- `GET /api/auth/me` — 현재 사용자

## API 키

- `GET /api/settings/api-keys` — 내 키 목록
- `POST /api/settings/api-keys` — 키 생성 `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — 키 취소

## 논문 (Papers)

- `GET /api/papers` — 목록. 쿼리 파라미터: `q` (전문 또는 `title:`/`au:`/`abs:`/`cat:` 접두사), `category`, `tag`, `sort` (`new` | `updated` | `by_citations`), `from` (ISO 날짜, 해당 일자 이후 생성된 논문만), `page`, `pageSize`. 행에는 해석된 `citationCount` 포함.
- `GET /api/papers/:id` — 상세 (`submitter`, `tags`, `commentCount` 포함)
- `GET /api/papers/:id/comments` — 댓글
- `GET /api/papers/:id/citations` — 인용 그래프 `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — 논문의 태그
- `POST /api/papers` — 제출 (인증 필요, `paper:publish` 필요); JSON 또는 multipart(meta + 선택 `pdf` 파일) 수락
- `POST /api/papers/:id/moderate` — 검토 `{action:"approve"|"reject"|"withdraw", reason?}` (`paper:moderate` 필요)
- `POST /api/papers/:id/citations` — 인용 추가 `{targetArxivId?|targetDoi?|targetTitle?}` (소유자/moderator/admin)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — 태그 연결/해제 `{tagId|name}` (소유자/moderator/admin; 이름이 새 것이면 태그 생성)
- `POST /api/submit/archive` — 소스 패키지 `tar.gz`를 업로드해 자동 수집, 인용 연결, PDF 빌드 (인증 필요; [투고 가이드](/en/guide/submission) 참조)

## 분류 (Categories)

- `GET /api/categories` — 분류 트리

## 태그 (Tags)

- `GET /api/tags` — 사용 횟수를 포함한 모든 태그 (인기순)
- `POST /api/tags` — 태그 생성 `{name}` (인증 필요; 이름으로 멱등)

## 구독 (Subscriptions)

- `GET /api/subscriptions` — 내 구독 목록, **풍부화** (category/author/paper 이름이 `title` + `href` 딥 링크로 해석)
- `POST /api/subscriptions` — 구독 / 구독 해제 (토글) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — 구독 해제 `{type, refId}`

## 피드 및 알림

공지는 논문이 구독(분류 신규, 저자 신규)에 들어가거나, 누군가 댓글에 답하거나, 관리자 브로드캐스트에 의해 생성됩니다.

- `GET /api/feed` — 현재 사용자의 공지 (`?markRead=1`은 모두 읽음 표시도)
- `POST /api/feed` — 단일 공지 읽음 표시 `{id}`

헤더 벨(`FeedBell`)은 Zustand 스토어로 동기화되는 실시간 읽지 않음 배지를 보여주므로 어디서든 읽으면 즉시 배지가 갱신됩니다.

## 북마크 (Bookmarks)

- `GET /api/bookmarks` — 내 북마크 목록 (각각 논문 제목과 `groupName`으로 해석); `?paperId=`를 전달하면 단일 논문에 대한 `{ bookmarked: boolean }` 반환
- `POST /api/bookmarks` — 북마크 토글 `{paperId, group?}` (`{ bookmarked: true|false }` 반환)
- `PATCH /api/bookmarks/:paperId` — 북마크를 그룹으로 이동 `{group}` (null은 해제)
- `DELETE /api/bookmarks` — 북마크 제거 `{paperId}`

## 메시지 (Messages)

메시지는 `kind`로 8개 분류: `system`, `ticket_reply`, `announcement`, `review_result`, `co_review_request`, `co_review_result`, `admin_message`, `community_reply`.

- `GET /api/messages` — 현재 사용자의 메시지 + 읽지 않음 수 (`?kind=` 필터 지원)
- `GET /api/messages/stats` — 읽지 않음 통계
- `POST /api/messages/:id/read` — 읽음 표시
- `POST /api/messages` — `{action:"read-all"}` 모두 읽음 표시

## 티켓 (Tickets)

- `GET /api/tickets` — 내 티켓 (`?scope=all`은 관리자만)
- `POST /api/tickets` — 생성 `{subject, type, priority, message}`
- `GET /api/tickets/:id` — 상세
- `POST /api/tickets/:id` — 답변
- `PATCH /api/tickets/:id` — 관리자 상태/우선순위 갱신

## 피드백 (Feedback)

- `POST /api/feedback` — 피드백 제출 (인증 필요, 티켓 자동 생성)

## 공동 리뷰 (Co-review)

- `GET /api/co-reviews?scope=mine|all` — 목록 (내 것 / 전체, 각 권한 필요)
- `POST /api/co-reviews` — 배정 `{paperId, reviewerId, note?}` (`co_review:assign` 필요)
- `GET /api/co-reviews/:id` — 상세
- `POST /api/co-reviews/:id/respond` — 리뷰어 응답 `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — 의견 제출 `{decision:"approve"|"reject"|"revise", comment}`

## 관리 (Admin)

관리 엔드포인트는 `moderator` / `admin` 기본 역할이 필요하며 세밀 권한별로 인가됩니다.

- `GET /api/admin/users` — 사용자 목록 (페이지네이션 / 검색, `user:manage` 필요)
- `PATCH /api/admin/users/:id` — 역할 `{roleKeys:string[]}` 또는 오버라이드 `{permission:{key:string, grant:boolean|null}}` 설정 (`user:manage` / `permission:manage` 필요)
- `GET /api/admin/roles` — 역할 목록 (`role:manage` 필요)
- `PUT /api/admin/roles/:id` — 역할 권한 `{permissionKeys:string[]}` 설정
- `POST /api/admin/messages` — 브로드캐스트 `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (`message:broadcast` 필요)
- `GET /api/admin/stats` — 플랫폼 통계
