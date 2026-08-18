# Papex App

> Papex 학술 문헌 플랫폼의 공식 모바일 클라이언트 — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Papex App은 오픈소스 학술 문헌 플랫폼인 [Papex](https://github.com/Maicarons/papex)의 공식 모바일 클라이언트입니다. 웹 버전의 **모바일 대체**로 설계되었습니다: 논문을 읽고, 계정을 관리하고, 최신 상태를 유지하세요 — 어디서든.

**React Native 0.82 + RNOH 0.82.30** (HarmonyOS 적응)으로 빌드되어 Android, HarmonyOS, iOS에 걸쳐 하나의 코드베이스를 공유합니다 (약 95% 공유 비즈니스 코드).

> ⚠️ **의존성**: 이 앱은 Papex 서버 API를 사용합니다. 먼저 [Papex 백엔드](https://github.com/Maicarons/papex)를 배포하세요.

---

## 기능

| 우선순위 | 기능 | 상태 |
| --- | --- | --- |
| P0 | 로그인 / 가입 / 로그아웃, 다중 계정 전환, 기기 관리 (원격 취소) | 계획 |
| P0 | 홈 피드, 분류 트리 (257개 이중언어 분류), 페이지네이션 | 계획 |
| P0 | 키워드 검색 + 의미 검색 (`/api/search?semantic=1`) | 계획 |
| P0 | 논문 상세, 버전 전환, 진행 기억이 있는 PDF 열람 | 계획 |
| P0 | 북마크, 구독, 앱 내 메시지 / 티켓 / 피드백 | 계획 |
| P0 | 프로필, 추천(endorsement), 이중언어 UI (zh/en), 다크 모드 | 계획 |
| P1 | 오프라인 PDF 다운로드, 메타데이터 캐시, 오프라인 탐색 | 계획 |
| P1 | 기기 간 읽기 진행 동기화, 푸시 알림 (FCM / APNs / PushKit) | 계획 |
| P1 | 생체 인식 잠금 해제, API 키 관리, 스켈레톤/오류/빈 상태 | 계획 |
| P2 | 댓글, 추천(endorsement), 추천(개인화), 시스템 공유 시트, 읽기 통계 | 계획 |
| P3 | QR 로그인 (웹 ↔ 앱), 태블릿 레이아웃, 읽기 전용 주석 보기 | 계획 |

> 관리 / 검토 기능은 모바일 클라이언트에 **의도적으로 포함되지 않습니다** — 해당 작업은 웹 버전을 사용하세요.

---

## 플랫폼

| 플랫폼 | 채널 | 상태 |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / 중국 스토어 | 계획 |
| iOS (15+) | App Store | 계획 |
| HarmonyOS (API 12+) | AppGallery | 계획 |

---

## 설치

### 사전 빌드 바이너리

[Releases](https://github.com/Maicarons/papex-app/releases) 페이지(게시 후)에서 다운로드하거나 선택한 스토어에서 설치하세요.

### 소스에서

사전 요구 사항:

- Node.js 20+
- Android 빌드용 Android SDK (minSdk 24)
- iOS 빌드용 Xcode 15+ (macOS)
- HarmonyOS 빌드용 DevEco Studio 5.x (API 12+) + AGC 프로젝트

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# Papex 서버 OpenAPI 문서에서 API 타입 생성
npm run gen:types

# API 베이스 URL 구성
cp .env.example .env

# Android에서 실행
npm run android

# iOS에서 실행 (macOS만)
cd ios && pod install && cd ..
npm run ios

# HarmonyOS에서 실행: harmony/를 DevEco Studio에서 열고 AGC로 서명 후 기기/시뮬레이터에서 실행
```

환경 변수 (`.env`):

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `API_BASE_URL` | Papex 서버 베이스 URL | `https://api.papex.example.com` |
| `PUSH_ENABLED` | 푸시 등록 활성화 | `true` |
| `I18N_FALLBACK` | 폴백 언어 | `zh` |

---

## 개발

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # 단위 테스트 (Jest + RNTL, 커버리지)
npm run e2e:ios       # Detox E2E (iOS 시뮬레이터)
npm run e2e:android   # Detox E2E (Android 에뮬레이터)
npm run gen:types     # openapi.json에서 API 타입 재생성
npm run sync:i18n     # Papex 저장소에서 zh/en 사전 동기화
```

테스트 커버리지: 단위 테스트는 핵심 모듈(`lib/api`, `lib/security`, `lib/storage`, stores)에서 문장 커버리지 ≥80%를 목표; E2E는 P0 흐름(인증 → 탐색 → 읽기 → 북마크 → 구독 → 기기)을 커버. 기기 간 시나리오는 데스크톱 클라이언트와 함께 커버됩니다 ([개발 계획](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) 참조).

---

## 아키텍처 (하이라이트)

- **인증**: 액세스 토큰 (JWT, 15분) + 리프레시 토큰 (30일, 회전, 기기 바인딩). 토큰은 OS 보안 저장소에 보관: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **데이터**: 세션/환경설정/캐시용 MMKV; 앱 샌드박스에 LRU 교체로 캐시된 PDF 파일.
- **i18n**: i18next, Papex 저장소에서 동기화된 zh/en 사전.
- **타입**: Papex 서버 `openapi.json`에서 생성 — 절대 손으로 작성하지 않음.

전체 개발 계획은 Papex 저장소의 [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)를 보세요.

---

## 관련 프로젝트

- [Papex](https://github.com/Maicarons/papex) — 백엔드 플랫폼 (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — 데스크톱 연구 워크벤치 (Tauri 2)

---

## 라이선스

[Apache-2.0](LICENSE) — Copyright 2026 The Papex Authors.
