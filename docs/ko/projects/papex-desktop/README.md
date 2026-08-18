# Papex Desktop

> Papex 학술 문헌 플랫폼을 위한 데스크톱 연구 워크벤치 — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex Desktop은 오픈소스 학술 문헌 플랫폼인 [Papex](https://github.com/Maicarons/papex)를 데스크톱에 머무는 완전한 **연구 워크벤치**로 바꿉니다: 로컬 우선 라이브러리, 하이라이트와 메모가 있는 심층 PDF 열람, 인용 관리, 오프라인 전문 검색, 클라우드 동기화.

**Tauri 2.x** (Rust 코어 + 시스템 WebView)와 **Vite + React 19**로 빌드되어 가벼운 네이티브 앱(설치 파일 ≈5–15 MB, 메모리 30–50 MB)으로 제공됩니다.

> ⚠️ **의존성**: 이 앱은 Papex 서버 API를 사용합니다. 먼저 [Papex 백엔드](https://github.com/Maicarons/papex)를 배포하세요.

---

## 기능

| 우선순위 | 기능 | 상태 |
| --- | --- | --- |
| P0 | 로그인 / 로그아웃 / 다중 계정 (토큰을 OS 키체인에) | 계획 |
| P0 | 3페인 라이브러리: 257개 이중언어 분류 / 목록 / 상세, 필터 및 정렬 | 계획 |
| P0 | 온라인 키워드 + 의미 검색 (`/api/search?semantic=1`) | 계획 |
| P0 | PDF 리더 (pdf.js): 페이징, 확대, 검색, 북마크, 진행, 다크 반전 | 계획 |
| P0 | 하이라이트 (다색) + 텍스트 메모, 로컬 SQLite + 클라우드 동기화 | 계획 |
| P0 | 오프라인 PDF 캐시, 오프라인 열람, 캐시 관리 | 계획 |
| P0 | 대화형 인용 그래프 (ECharts), 구독 알림 | 계획 |
| P0 | 시스템 트레이, 전역 단축키 (Ctrl/Cmd+K), 단일 인스턴스 잠금 | 계획 |
| P1 | 인용 생성 (CSL: GB/T 7714, APA, MLA, …), BibTeX / RIS 내보내기 | 계획 |
| P1 | LaTeX 통합 (`\cite{key}` + 참고문헌 블록, papex-latex 경유) | 계획 |
| P1 | **파일 및 이미지 업로드**: 논문 투고, 로컬 PDF 가져오기, 아바타, 논문 표지 | 계획 |
| P1 | 저장된 검색 (스마트 폴더), 일괄 태그, 읽기 통계, 양분판 읽기 | 계획 |
| P2 | 로컬 전문 인덱스 (tantivy), 오프라인 밀리초 검색 | 계획 |
| P2 | 협업 보기 (공동 리뷰 / 추천(endorsement) / 댓글, 읽기 전용) | 계획 |
| P3 | 선택적 로컬 임베딩 (Ollama) 오프라인 의미 검색, 플러그인 프로토타입 | 계획 |

> 관리 / 검토 기능은 데스크톱 클라이언트에 **의도적으로 포함되지 않습니다** — 해당 작업은 웹 버전을 사용하세요.

---

## 플랫폼

| 플랫폼 | 아티팩트 | 채널 |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | 웹사이트 다운로드 + winget (선택) |
| macOS 11+ | .dmg (Developer ID + 공증) | 웹사이트 + App Store (선택) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | 웹사이트 + 배포판 저장소 (추후) |

---

## 설치

### 사전 빌드 바이너리

플랫폼용 설치 프로그램을 [Releases](https://github.com/Maicarons/papex-desktop/releases) 페이지(게시 후)에서 다운로드하세요.

### 소스에서

사전 요구 사항:

- Node.js 20+ & pnpm 9+
- Rust 툴체인 (stable)
- Windows: WebView2 (Win10/11에 사전 설치); Linux: `libwebkit2gtk-4.1-dev` 등 (아래 참조)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# Papex 서버 OpenAPI 문서에서 API 타입 생성
pnpm gen:types

# API 베이스 URL 구성
cp .env.example .env

# 개발 (프론트엔드 HMR + Tauri 창)
pnpm tauri dev

# 현재 플랫폼용 빌드
pnpm tauri build
```

Linux 의존성 (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

환경 변수 (`.env`):

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `API_BASE_URL` | Papex 서버 베이스 URL | `https://api.papex.example.com` |
| `I18N_FALLBACK` | 폴백 언어 | `zh` |
| `CACHE_LIMIT_MB` | 로컬 PDF 캐시 한도 (MB) | `2048` |

---

## 개발

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # 프론트엔드 단위 테스트 (Vitest, 커버리지)
cargo test           # Rust 단위 테스트 (src-tauri)
cargo clippy         # Rust 린트 (CI가 -D warnings 강제)
pnpm e2e             # 로컬 Papex 백엔드 대상 Playwright E2E
pnpm gen:types       # openapi.json에서 API 타입 재생성
pnpm sync:i18n       # Papex 저장소에서 zh/en 사전 동기화
```

테스트 커버리지: 프론트엔드 ≥80% 문장 커버리지(핵심 모듈), Rust ≥85% (`commands/*`, `db/*`, `indexer/*`); E2E는 P0 흐름(인증 → 라이브러리 → 읽기 → 주석 → 오프라인 → 업로드)을 커버. 기기 간 시나리오(데스크톱 ↔ 모바일 ↔ 웹)는 모바일 클라이언트와 함께 커버 — [개발 계획](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) 참조.

---

## 아키텍처 (하이라이트)

- **인증**: 액세스 토큰 (JWT, 15분) + 리프레시 토큰 (30일, 회전, 기기 바인딩). 토큰은 OS 키체인에 보관: Windows Credential Manager / macOS Keychain / Linux Secret Service (파일 폴백).
- **로컬 우선**: 캐시 / 주석 / 진행 / 동기화 큐용 SQLite `papex_local.db`; 오프라인 전문 인덱스용 tantivy (P2).
- **업로드**: PDF 투고 및 가져오기, 아바타, 논문 표지 — Rust에서 검증 후 진행 및 재시도와 함께 Papex 서버로 업로드.
- **타입**: Papex 서버 `openapi.json`에서 생성 — 절대 손으로 작성하지 않음.

전체 개발 계획은 Papex 저장소의 [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md)를 보세요.

---

## 관련 프로젝트

- [Papex](https://github.com/Maicarons/papex) — 백엔드 플랫폼 (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — 공식 모바일 클라이언트 (React Native + RNOH)

---

## 라이선스

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
