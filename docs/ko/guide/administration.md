# 관리 및 권한

핵심 투고·검색 기능 외에도 Papex는 운영자용 **관리 영역**과 **세밀한 권한 시스템**을 제공합니다. 이 가이드는 네 가지 기능을 다룹니다:

1. **역할 및 권한 (RBAC)** — 역할별 또는 사용자별로 논문 게시·조회·다운로드·댓글을 제어.
2. **사용자 권한 관리** — 추가 역할을 부여하고 모든 권한에 대해 사용자별 허용/거부 오버라이드 설정.
3. **공동 리뷰 (피어 리뷰)** — 관리자가 공동 리뷰 요청을 보내면, 리뷰어가 수락·의견 제출·접수증 수령으로 이어지는 폐쇄형 루프.
4. **분류된 메시지 및 브로드캐스트** — 시스템 공지·리뷰 결과·티켓 접수증·공동 리뷰 요청·관리자 DM·커뮤니티 답글을 아우르는 통합 알림 센터와 함께 타겟 브로드캐스트.

---

## 1. 역할 및 권한 (RBAC)

Papex는 **기본 역할 + 부여 역할 + 사용자별 오버라이드**라는 3계층 모델을 사용해, 역할 기반 대량 권한 부여와 사용자별 개인화 제한을 모두 지원합니다.

### 1.1 권한 모델

| 계층 | 설명 | 유지 위치 |
| --- | --- | --- |
| 기본 역할 | `users.role`에 내재된 모든 사용자의 역할: `author` / `moderator` / `admin` | 가입 시 기본 `author` |
| 부여 역할 | `user_roles` 조인 테이블을 통해 사용자에 겹쳐지는 추가 역할 | 사용자 관리 페이지 |
| 사용자별 오버라이드 | 단일 권한에 대한 명시적 *허용* 또는 *거부*; 최우선 | 사용자 관리 페이지 |

> ℹ️ `reader`는 **부여된** RBAC 역할(`roles` 테이블)이며, 데이터베이스 기본 역할이 아닙니다(`users.role`은 `author` / `moderator` / `admin`만 허용). 기본 역할은 로그인과 기본 권한 경계를 정의하고, 부여 역할이 그 위에 쌓입니다.

### 1.2 권한 목록

시스템은 **6개 그룹에 걸쳐 15개 권한**을 제공합니다:

| 그룹 | 권한 키 | 이름 | 설명 |
| --- | --- | --- | --- |
| paper | `paper:publish` | 논문 게시 | 새 논문 또는 버전 제출 |
| | `paper:view` | 논문 조회 | 게시된 논문 탐색 |
| | `paper:download` | 논문 다운로드 | PDF / 소스 패키지 다운로드 |
| | `paper:moderate` | 논문 검토 | 승인 / 거절 / 철회 |
| comment | `comment:create` | 댓글 작성 | 논문에 댓글 및 답글 |
| | `comment:view` | 댓글 조회 | 댓글 섹션 탐색 |
| ticket | `ticket:create` | 티켓 생성 | 피드백 / 티켓 개설 |
| | `ticket:manage` | 티켓 관리 | 티켓 답변 / 처리 |
| co_review | `co_review:assign` | 공동 리뷰 배정 | 공동 리뷰 요청 전송 |
| | `co_review:respond` | 공동 리뷰 수락 | 요청 수락 / 거절 |
| | `co_review:manage` | 공동 리뷰 관리 | 모든 공동 리뷰 진행 보기 |
| message | `message:broadcast` | 브로드캐스트 | 사용자에게 메시지 전송 |
| admin | `user:manage` | 사용자 관리 | 사용자 보기 / 편집 |
| | `role:manage` | 역할 관리 | 역할 및 권한 구성 |
| | `permission:manage` | 오버라이드 관리 | 사용자별 허용 / 거부 |

### 1.3 기본 역할 권한

시드(`db:seed`)는 각 시스템 역할에 대한 기본 권한 매핑을 기록합니다:

| 역할 | 개수 | 권한 |
| --- | --- | --- |
| `admin` | 15 | 모든 권한 |
| `moderator` | 12 | 논문 조회/다운로드/검토, 댓글 작성/조회, 티켓 생성/관리, 공동 리뷰 배정/응답/관리, 브로드캐스트, 사용자 관리 |
| `author` | 6 | 논문 게시/조회/다운로드, 댓글 작성/조회, 티켓 생성 |
| `reader` | 3 | 논문 조회/다운로드, 댓글 조회 |

### 1.4 해석 순서

보호된 작업이 실행될 때 유효 권한은 다음과 같이 해석됩니다:

```
기본 역할 권한
  ∪ 부여 역할 권한      (역할 합집합)
  ∪ 허용으로 표시된 사용자별 오버라이드
  − 거부로 표시된 사용자별 오버라이드  (오버라이드 우선)
```

따라서 기본 역할도 부여 역할도 `paper:publish`를 부여하지 않더라도 명시적 *허용* 오버라이드는 여전히 허용하며, 반대로 역할이 부여하더라도 명시적 *거부*는 차단합니다.

> 폴백: `roles` / `permissions` 테이블이 아직 시드되지 않았다면(예: `db:seed` 없는 새 DB), 엔진은 위의 상수 기본 매핑으로 폴백해 전체 사이트 잠금을 방지합니다. 배포 후 `db:seed` 실행을 권장합니다.

### 1.5 보호된 작업 (게이트웨이)

주요 작업은 게이트로 막히며, 권한이 없으면 `403`을 반환합니다:

- `POST /api/papers` — `paper:publish` 필요
- `POST /api/papers/:id/comments` — `comment:create` 필요
- 검토, 티켓 처리, 공동 리뷰 배정/관리, 사용자 및 역할 편집, 브로드캐스트 등은 각 권한이 필요하며, 라우트는 `middleware`로 보호됩니다(`moderator` / `admin`만 `/admin` 진입 가능).

---

## 2. 사용자 권한 관리

**`/admin/users`** 열기 (requires `user:manage`):

- **사용자 검색**: 사용자 이름 / 이메일 / 표시 이름으로 검색, 페이지네이션 포함.
- **추가 역할 부여**: 사용자 편집기에서 시스템 역할(`admin` / `moderator` / `author` / `reader`)을 선택해 기본 역할 위에 쌓기.
- **삼상태 권한 오버라이드**: 15개 권한 각각에 대해:
  - **상속** (기본) — 역할 합집합 결과를 따름;
  - **허용** — 역할이 생략해도 강제 부여;
  - **거부** — 역할이 포함해도 강제 차단.

모든 변경은 `PATCH /api/admin/users/:id`로 즉시 저장되며 해당 사용자의 이후 권한 검사에 적용됩니다.

---

## 3. 공동 리뷰 (피어 리뷰)

공동 리뷰는 **관리자 → 리뷰어 → 저자**를 잇는 완결된 피어 리뷰 루프입니다.

### 3.1 폐쇄형 루프

```
관리자 배정 ──► 리뷰어가 "공동 리뷰 요청" 메시지 수신
     │
     ▼
리뷰어 응답 (수락 / 거절)
     │ 수락
     ▼
리뷰어 의견 제출 (승인 / 거절 / 수정 + 코멘트)
     │
     ▼
시스템 접수증 ──► 배정자에게 "의견 제출됨" 알림
                ──► 저자에게 "공동 리뷰 완료됨" 알림 (저자 ≠ 배정자인 경우)
```

### 3.2 상태 머신

공동 리뷰 레코드(`co_reviews`)는 다음과 같이 전이합니다:

| 상태 | 의미 | 진입자 |
| --- | --- | --- |
| `pending` | 리뷰어 응답 대기 | 관리자 배정 (`POST /api/co-reviews`) |
| `accepted` | 수락됨 | 리뷰어 수락 (`POST /api/co-reviews/:id/respond` `{accepted:true}`) |
| `declined` | 거절됨 | 리뷰어 거절 (`respond` `{accepted:false}`) |
| `completed` | 완료됨 | 리뷰어 의견 제출 (`submit`) |
| `expired` | 만료됨 | (타임아웃 종료를 위한 예약 상태) |

> 리뷰어는 `pending` 상태에서만 응답할 수 있고, `accepted` 상태에서만 의견을 제출할 수 있습니다. 상태가 맞지 않으면 `INVALID_STATE`를 반환합니다.

### 3.3 진입점 및 알림

- **관리자**: `/admin/co-reviews`에서 모든 공동 리뷰를 배정·모니터링; `/admin/co-reviews/:id`에서 상세. 배정은 `submitted` 상태의 논문에서 선택.
- **리뷰어**: `/co-reviews` (내 리뷰) 및 `/co-reviews/:id` (수락 / 거절 + 의견 제출).
- **통합 알림**: 모든 상태 변화는 관련 당사자에게 `co_review_request` / `co_review_result` 메시지를 보냅니다 (4절 참조).

---

## 4. 분류된 메시지 및 브로드캐스트

### 4.1 메시지 분류

메시지는 `kind`로 **8개 분류**로 나뉘며 받은 편지함에서 색상과 그룹으로 표시됩니다:

| kind | 라벨 | 톤 | 전형적 출처 |
| --- | --- | --- | --- |
| `system` | 시스템 공지 | 기본 | 시스템 이벤트 |
| `ticket_reply` | 티켓 접수증 | info 블루 | 티켓 답변 |
| `announcement` | 공지 | warning 옐로 | 관리자 브로드캐스트 |
| `review_result` | 리뷰 결과 | success 그린 | 논문 승인 / 거절 |
| `co_review_request` | 공동 리뷰 요청 | 퍼플 | 공동 리뷰 배정 |
| `co_review_result` | 공동 리뷰 접수증 | 퍼플 | 응답 / 의견 제출 |
| `admin_message` | 관리자 DM | danger 레드 | 타겟 직접 메시지 |
| `community_reply` | 커뮤니티 답글 | info 블루 | 댓글 답글 |

받은 편지함(`/messages`)은 분류별 필터(`GET /api/messages?kind=...`)를 지원하며, 메시지를 클릭하면 관련 `link`(논문, 티켓, 공동 리뷰 등)로 이동합니다.

### 4.2 통합 알림 퍼널

모든 모듈 간 경고는 단일 `notifications` 서비스를 통해 발행되어, 리뷰·티켓·공동 리뷰·커뮤니티 모듈이 하나의 알림 계약을 공유합니다:

- **리뷰**: 논문 결정 → 저자에게 알림 (`review_result`).
- **티켓**: 담당자 답변 → 신고자에게 알림 (`ticket_reply`).
- **공동 리뷰**: 배정 / 응답 / 제출 → 리뷰어·배정자·저자에게 알림 (`co_review_request` / `co_review_result`).
- **커뮤니티**: 댓글 답글 → 부모 댓글 저자에게 알림 (`community_reply`).

### 4.3 브로드캐스트

**`/admin/messages`** 열기 (requires `message:broadcast`):

- **범위**:
  - `all` — 모든 사용자;
  - `role` — 기본 역할 (`author` / `moderator` / `admin`);
  - `userIds` — 특정 사용자 ID 목록.
- **종류**: `announcement` / `system` / `admin_message`.
- 제목, 본문(선택적 `link`), 제출을 채우면 메시지가 대상에게 일괄 기록되고 성공 수가 반환됩니다.

---

## 5. 관리 내비게이션

관리 진입점은 로그인 사용자 메뉴와 `/admin` 개요에 있으며 다음을 포함합니다:

| 모듈 | 라우트 | 설명 |
| --- | --- | --- |
| 개요 | `/admin` | 통계 카드 + 모듈 바로가기 |
| 리뷰 대기열 | `/admin/review` | 논문 승인 / 거절 (+ 사유) |
| 통계 | `/admin/stats` | 플랫폼 지표 |
| 티켓 | `/admin/tickets` | 티켓 처리 |
| 공동 리뷰 | `/admin/co-reviews` | 공동 리뷰 배정 및 모니터링 |
| 사용자 | `/admin/users` | 역할 및 권한 오버라이드 |
| 역할 | `/admin/roles` | 역할 권한 매트릭스 |
| 메시지 | `/admin/messages` | 브로드캐스트 |

> 이 라우트는 `middleware`로 보호되며, `moderator` 또는 `admin` 기본 역할을 가진 사용자만 접근할 수 있고, 쓰기 동작은 추가로 해당 세밀 권한이 필요합니다.

---

## 6. 운영: 마이그레이션 및 시드

네 시스템은 마이그레이션 `0003_add_rbac_co_review_messages`에 의존합니다 (`roles` / `permissions` / `role_permissions` / `user_roles` / `user_permissions` / `co_reviews` / `moderation_logs` 추가, `messages.kind`를 8개 분류로 확장). 배포 또는 로컬 초기화 시 실행:

```bash
npm run db:migrate   # 마이그레이션 적용 (RBAC / 공동 리뷰 / 메시지 분류)
npm run db:seed      # 4개 시스템 역할 + 15개 권한 + 기본값 기록 (멱등)
```

RBAC 시드는 `onConflictDoNothing`을 사용해 재실행해도 안전합니다. 마이그레이션 + 시드 후 권한 엔진은 `roles` / `permissions` 테이블을 사용하며, 시드 전에는 상수 기본값으로 폴백합니다 (1.4절 참조).

---

## 7. API 빠른 참조

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/messages?kind=` | 받은 편지함, 분류별 필터 |
| `POST` | `/api/papers/:id/moderate` | 검토 `{action:"approve"\|"reject"\|"withdraw", reason?}` |
| `GET` | `/api/co-reviews?scope=mine\|all` | 공동 리뷰 목록 (내 것 / 전체) |
| `POST` | `/api/co-reviews` | 배정 `{paperId, reviewerId, note?}` |
| `GET` | `/api/co-reviews/:id` | 공동 리뷰 상세 |
| `POST` | `/api/co-reviews/:id/respond` | 응답 `{accepted:boolean}` |
| `POST` | `/api/co-reviews/:id/submit` | 제출 `{decision:"approve"\|"reject"\|"revise", comment}` |
| `GET` | `/api/admin/users` | 사용자 목록 (페이지네이션 / 검색) |
| `PATCH` | `/api/admin/users/:id` | 역할 `{roleKeys}` 또는 오버라이드 `{permission:{key,grant}}` 설정 |
| `GET` | `/api/admin/roles` | 역할 목록 |
| `PUT` | `/api/admin/roles/:id` | 역할 권한 `{permissionKeys}` 설정 |
| `POST` | `/api/admin/messages` | 브로드캐스트 `{scope, role?, userIds?, kind, title, body, link?}` |
| `GET` | `/api/admin/stats` | 플랫폼 통계 |

전체 목록은 [API 참조](/en/guide/api)를 보세요.
