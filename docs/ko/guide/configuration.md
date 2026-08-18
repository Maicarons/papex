# 구성

Papex는 환경 변수로 구성합니다.

## 데이터베이스

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## 인증

```bash
# JWT 서명에 사용하는 비밀. 운영에서는 반드시 길고 무작위인 문자열이어야 함 (>= 16자).
AUTH_SECRET=change-me-to-a-long-random-string
# 세션 TTL (초, 기본 7일)
AUTH_SESSION_TTL=604800
```

### API 키

API 키를 사용하면 스크립트와 통합이 브라우저 세션 없이 API를 호출할 수 있습니다.
**설정 → API 키** (`/settings/api-keys`)에서 생성하며, 원본 비밀은 한 번만 표시됩니다. 키는 SHA-256으로 해시되어
계정에 묶이므로 소유자의 역할 RBAC 권한을 상속합니다 — 추가 구성은 필요하지 않습니다. 다음과 같이 전송하세요:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

공개 엔드포인트(논문, 검색, 분류, 저자, 헬스)는 익명 요청도 허용합니다.

## 이메일 (선택)

메시지와 티켓 시스템은 이메일을 필요로 하지 않습니다. 알림 이메일을 보내려면 SMTP를 구성하세요:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## 저장소 (PDF 백엔드)

업로드된 PDF는 `STORAGE_DRIVER`로 선택하는 플러그형 백엔드가 저장합니다.

### `local` (기본)

서버가 자체 파일 시스템의 `PAPEX_STORAGE_DIR`(기본 `./storage`)에서 PDF 파일을 관리합니다.
바이트는 `/api/papers/{id}/pdf/{version}` 라우트로 스트리밍 반환됩니다. Docker / 자체 호스팅 / 개발에 사용하세요.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (S3 호환 객체 저장소)

업로드는 S3 호환 버킷(AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces)으로 갑니다.
그러면 스트리밍 라우트가 **서명된**(또는 공개) 객체 URL로 `302` 리디렉션을 반환하므로,
PDF는 객체 저장소가 제공하고 서버를 절대 거치지 않습니다 — Vercel 같은 읽기 전용/서버리스 플랫폼에 필요합니다.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # AWS는 us-east-1; Cloudflare R2는 "auto"
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # R2 / MinIO / Spaces에는 필수
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # MinIO/R2/Spaces는 true; AWS 가상 호스트는 false
# 선택: 버킷/CDN이 공개라면 서명을 건너뛰도록 이 베이스 URL 설정:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

백엔드와 무관하게, 각 논문 버전에 저장된 `pdfUrl`은 항상 스트리밍 라우트를 가리키므로 UI와 API는 백엔드를 알 필요가 없습니다.
