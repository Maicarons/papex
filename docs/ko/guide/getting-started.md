# 시작하기

이 가이드는 Papex를 로컬에서 실행하는 방법을 안내합니다.

## 요구 사항

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker 권장)
- npm 또는 pnpm

## 1. 의존성 설치

```bash
npm install
```

## 2. 데이터베이스 준비

번들된 `docker-compose.yml`로 Postgres를 시작합니다:

```bash
docker compose up -d db
```

환경 설정 파일을 복사하고 채웁니다:

```bash
cp .env.example .env
# 최소한 DATABASE_URL과 AUTH_SECRET을 설정하세요
```

## 3. 마이그레이션 및 시드 실행

```bash
npm run db:migrate
npm run db:seed
```

`db:seed`는 전체 분류 체계, 샘플 논문, 관리자 계정을 기록합니다.

## 4. 개발 서버 시작

```bash
npm run dev
```

http://localhost:3000 로 접속하세요.

## 기본 계정

| 역할 | 사용자 이름 | 비밀번호 |
| --- | --- | --- |
| 관리자 | `admin` | `admin123456` |
| 저자 (샘플) | `demo` | `password123` |

> 운영 환경에서는 기본 비밀번호를 변경하고 길고 무작위의 `AUTH_SECRET`을 사용하세요.
