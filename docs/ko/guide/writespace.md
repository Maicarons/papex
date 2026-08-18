# 온라인 집필 (Writespace)

이 가이드는 Papex의 내장 **온라인 집필** 모듈(진입점 `/writespace`)을 다룹니다 — 로컬 TeX 설치나 직접 작성한 JSON 없이도 되는 브라우저 기반 작성 데스크입니다. 이는 [투고 가이드](/en/guide/submission)의 "소스 패키지 업로드" 흐름을 브라우저로 옮깁니다. 메타데이터를 입력하고 본문을 온라인으로 작성하면, 시스템이 규격에 맞는 `papex.json`과 섹션 `.tex` 파일을 생성합니다. 그런 다음 **`tar.gz`를 내보내거나** **한 번에 플랫폼에 게시**할 수 있습니다.

---

## 1. 개요

### 1.1 해결하는 문제점

| 기존 "소스 패키지 업로드"의 문제점 | 온라인 집필이 하는 일 |
| --- | --- |
| `papex.json`을 직접 작성하면 오류가 나기 쉬움 (필드 누락, 형식 오류) | 시각적 편집기 + 실시간 검증 |
| 구조 확인에 로컬 Python / TeX 설치 필요 | 중간 `.tex`이 브라우저에서 생성 — 로컬 툴체인 불필요 |
| 패키징과 업로드가 별개 단계 | 편집기에서 "내보내기"와 "게시"를 한 번의 클릭으로 |
| 작성 중 작업 손실 | 브라우저 `localStorage`에 자동 저장 |

### 1.2 세 가지 탭

| 탭 | 목적 |
| --- | --- |
| **메타데이터** | 논문 정보, 저자, 참고문헌, 빌드 옵션 — `papex.json`을 위한 시각적 편집기 |
| **본문** | LaTeX 본문 작성을 위한 구조화된 섹션 / 부록 작업대 |
| **내보내기 및 게시** | 실시간 검증, 아카이브 파일 미리보기, `tar.gz` 내보내기 / 한 번 게시 |

### 1.3 투고 시스템과의 관계

온라인 집필은 새로운 투고 방법이 **아니라** "소스 패키지 업로드"의 **집필 프론트엔드**입니다. 이 모듈이 만드는 아카이브는 [소스 패키지 업로드](/en/guide/submission#3-method-2-source-package-upload)와 바이트 단위로 호환되며, 게시는 동일한 백엔드 엔드포인트 `POST /api/submit/archive`를 재사용해 "풀기 → 검증 → 논문 생성 → 인용 그래프 연결 → PDF 빌드" 파이프라인을 따릅니다 ([투고 가이드 §4](/en/guide/submission#4-end-to-end-processing-flow-backend) 참조).

---

## 2. 진입점 및 권한

- **진입점**: `/writespace`.
- **페이지 단위 인증**: 서버 컴포넌트 `src/app/writespace/page.tsx`가 `getCurrentUser()`를 호출하고 인증되지 않으면 `redirect("/login")`.
- **미들웨어**: `src/middleware.ts`가 `/writespace`를 `PROTECTED_PREFIXES`에 추가하고 `/writespace/:path*`를 `matcher`에 추가해, 인증되지 않은 요청이 엣지에서 차단됩니다.
- **게시 권한**: 게시는 본질적으로 소스 패키지 투고이므로 동일한 `FORBIDDEN` / `PAPER_NOT_FOUND` 규칙을 따릅니다 ([투고 가이드 §4](/en/guide/submission#4-end-to-end-processing-flow-backend)) — `paper.id`가 새 버전을 선언하면 해당 논문에 투고 권한이 있어야 합니다.

---

## 3. 탭 1: 메타데이터 편집기

**메타데이터** 탭은 `MetadataEditor`에 해당합니다. `papex.json`의 `paper` / `authors` / `references` / `build` 블록을 카드 형태 폼으로 나누며, 필드는 [투고 가이드 §3.2](/en/guide/submission#32-papexjson-field-reference)와 일대일로 정렬됩니다.

### 3.1 논문 정보 (`metaPaper`)

제목, 부제, 초록, 키워드(쉼표 구분), 주 분류(드롭다운, 필수), 부 분류(추가/제거), DOI, 라이선스(드롭다운, 기본 `CC-BY-4.0`), venue, 버전 메모, 언어, 논문 ID(선택 — 입력하고 기존 논문 중 하나에 속하면 새 버전으로 제출).

### 3.2 저자 (`metaAuthors`)

- 여러 저자 추가; 각 카드는 위/아래 이동과 제거 지원.
- 필드: 이름(필수), 소속, 이메일, ORCID(형식 검사), 홈페이지, 교신저자 토글, 공동 기여 토글, 각주, 순서.
- 교신저자 / 공동 기여 / 각주는 PDF에서 `\thanks` 각주로 렌더링됩니다; ORCID와 홈페이지도 각주에 표시됩니다.

### 3.3 참고문헌 (`metaReferences`)

- 여러 BibTeX 항목 추가; 필드에는 인용 키(필수, 형식 검사), 유형(드롭다운, 12개 BibTeX 유형), 제목, 저자, journal, booktitle, year, DOI, URL, arXiv ID, pages, volume, number, publisher, note 포함.
- 두 가지 목적: ① 게시 시 `mapReferencesToCitations`로 플랫폼 인용 그래프에 연결; ② 내보내기 시 `references.bib` 자동 생성에 사용 ([§7](#7-exported-archive-structure) 참조).

### 3.4 빌드 옵션 (`metaBuild`)

- 참고문헌 스타일: `numeric` / `authoryear` (메인 문서에 `\documentclass[11pt,bibstyle=authoryear]`로 주입).
- 컬럼: `1` / `2` (두 컬럼은 `twocolumn` 주입).
- 기타 `build` 옵션(예: `fontset`, `documentclass`)은 서버 측 컴파일을 위해 예약; 기본값은 `createDefaultDraft` 참조.

### 3.5 실시간 검증

모든 수정은 `validateDraft()` (`src/lib/writespace/manifest.ts`)를 거치며, 결과는 **내보내기 및 게시** 탭과 공유됩니다. 핵심 규칙:

| 검사 | 규칙 | 유형 |
| --- | --- | --- |
| `schemaVersion` | `x.y.z`와 일치해야 | error |
| `paper.title` / `abstract` / `primaryCategoryId` | 필수이며 비어 있지 않아야 | error |
| `paper.id` (선택) | 있으면 `YYMM.NNNNN`와 일치해야 | error |
| `authors` | 최소 1개; 각 `name` 필수; `orcid`는 `0000-0000-0000-0000`와 일치 | error |
| `sections` | 최소 1개; 각 `file` 필수; `id`는 문자·숫자·`-`·`_`만 | error |
| `references` | 각 `key` 필수, `A-Za-z0-9_:+.-`로 제한; `year` ∈ [0, 3000] | error |
| 빈 섹션 본문 | 권고 | warning |

> "error"는 게시를 막습니다; "warning"(예: 빈 섹션 본문)은 권고일 뿐입니다.

---

## 4. 탭 2: 본문 작업대

**본문** 탭은 `SectionsEditor`에 해당하며 논문 본문과 부록을 구조적으로 관리합니다.

### 4.1 섹션 목록

- 각 섹션(또는 부록)은 접을 수 있는 카드: id/파일명 (`file`, 예: `sections/intro.tex`), 섹션 제목, 레벨 (`section` / `subsection` / `subsubsection` / `chapter` / `part`), 본문 (LaTeX 텍스트 영역), 문자 수.
- 지원: 섹션 추가, 부록 추가, 위/아래 이동, 제거.
- 레벨은 내보내기 시 생성되는 명령을 결정합니다 (`\section{Title}` → `\input{sections/intro.tex}`).

### 4.2 본문 내용 규칙

- 섹션 `.tex`은 직접 작성되며 **전체 LaTeX**를 지원합니다: 수식, 그림, 사용자 정의 명령, 그리고 참고문헌 키와 일치하는 `\cite{key}` 참조.
- 섹션 본문은 **이스케이프되지 않습니다** ([투고 가이드 §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)과 일치); "메타데이터"의 일반 텍스트 필드만 이스케이프됩니다.
- "샘플 섹션 삽입" 버튼은 LaTeX 수식이 포함된 다섯 개의 데모 섹션(intro / related work / method / experiments / conclusion)을 작성해 빠른 시작을 돕습니다.

### 4.3 부록

부록 항목은 섹션 구조를 공유하며 단일 `\appendix` 뒤에 출력됩니다.

---

## 5. 탭 3: 내보내기 및 게시

**내보내기 및 게시** 탭은 `ExportPanel`에 해당하며 전체 흐름의 출구입니다.

### 5.1 검증 상태

상단에 실시간 `validateDraft()` 결과를 표시합니다: "유효" 또는 "무효"와 함께 오류/경고 목록. **게시** 버튼은 오류가 있는 동안 비활성화됩니다.

### 5.2 파일 매니페스트 미리보기

생성될 아카이브 파일(`buildArchiveFiles`의 출력, [§7](#7-exported-archive-structure))을 보여주어 다운로드/게시 전 구조를 확인할 수 있습니다.

### 5.3 `tar.gz` 내보내기

**내보내기**를 클릭하면 `tar.gz`가 브라우저에서 완전히 생성되어 다운로드를触发합니다 (파일명은 i18n `writespace.expDownloadName`).

- 완전히 **의존성 없음**: `src/lib/writespace/targz.ts`가 POSIX ustar 패킹과 네이티브 `CompressionStream('gzip')`을 직접 구현 — 백엔드 개입 없음.
- 템플릿 에셋(`papex-template.tex` / `papex.cls`)은 내보내기 시 `/writespace/papex-template.tex` 및 `/writespace/papex.cls`에서 가져와 아카이브에 묶어 **자립적**으로 만듭니다 (백엔드는 `latexmk`로 직접 컴파일).

### 5.4 한 번에 게시

**게시**를 클릭하면 내보내기와 동일한 생성 단계를 실행한 뒤 `tar.gz`를 `multipart/form-data` 요청의 `file` 필드로 `/api/submit/archive`에 `POST`합니다.

- 게시는 사전에 `validation.valid === true`가 필요합니다.
- 성공 시 반환된 "논문 ID + 버전"과 `warnings`, "논문 보기" 링크를 표시하고 로컬 초안 플래그를 지웁니다.
- 실패 시 백엔드 오류 메시지를 인라인으로 표시합니다 ([투고 가이드 §4 오류 표](/en/guide/submission#4-end-to-end-processing-flow-backend) 매핑).

---

## 6. 자동 저장 및 초안 복원

- 초안(`manifest` + 섹션별 본문)은 브라우저 `localStorage`에 자동 저장됩니다 (키: `papex-writespace-draft`, 400ms 디바운스) — 페이지 닫아도 유지.
- `/writespace`를 다시 열면 마지막 초안을 자동 복원하고 "로컬 초안 복원됨"을 표시하며, 수정 후에는 "자동 저장됨"을 표시합니다.
- 상단 **새로 만들기** 버튼은 확인을 묻고 `localStorage`를 지운 뒤 빈 초안(샘플 intro 섹션 하나 포함)으로 초기화합니다.

> 초안은 로컬 브라우저에만 존재합니다; 기기를 바꾸거나 브라우저 데이터를 지우면 사라집니다.
> 중요한 작업은 반드시 **내보내기** 또는 **게시**하세요.

---

## 7. 내보낸 아카이브 구조

**내보내기 / 게시**로 만든 `tar.gz`는 `buildArchiveFiles()`가 조립하며 백엔드 `papex-archive.ts`가 기대하는 것과 완전히 호환됩니다:

```
my-paper.tar.gz
├── papex.json            # 편집기 매니페스트, 직렬화됨 (2칸 들여쓰기)
├── papex-template.tex    # bibstyle/twocolumn이 주입된 메인 문서
├── papex.cls             # 문서 클래스 (/writespace/papex.cls에서 번들)
├── references.bib        # 참고문헌에서 자동 생성 (없으면 생략)
├── sections/
│   ├── intro.tex         # "본문"에서 작성한 섹션
│   └── …
└── _papex_*.tex          # 자동 생성된 중간 조각 (수정하지 마세요)
    ├── _papex_meta.tex       # title/authors/affiliations/keywords/running title
    ├── _papex_abstract.tex   # abstract
    ├── _papex_sections.tex   # \section + \input 조립
    ├── _papex_backmatter.tex # acknowledgments/funding
    └── _papex_appendices.tex # \appendix + appendices
```

- `_papex_*.tex` 파일은 `genMeta` / `genAbstract` / `genSections` / `genBackmatter` / `genAppendices`가 생성하며, 일반 텍스트 필드는 단일 패스 `latexEscape`를 거치고 섹션 본문은 `\input`으로 그대로 들어갑니다.
- 이 아카이브는 "소스 패키지 업로드" 페이지에서 수동으로 업로드하거나 **게시** 버튼이 자동으로 제출할 수 있습니다 — 둘은 동일합니다.

---

## 8. 구현 노트

| 관심사 | 구현 |
| --- | --- |
| 데이터 모델 | `src/lib/writespace/manifest.ts`: `papex.schema.json` + `papex-json.ts`에 정렬된 타입, 순수 프론트엔드, 서버 임포트 없음 |
| LaTeX 생성 | `src/lib/writespace/latex-gen.ts`: `papex-build.py` 로직을 TS로 이식; 이스케이프는 **단일 패스 문자 스캔** 사용 (고정된 `papex-build.py`와 일치, `\textbackslash{}` 재이스케이프 방지) |
| 패킹 | `src/lib/writespace/targz.ts`: 직접 구현한 ustar + `CompressionStream('gzip')`, 의존성 없음, 순수 브라우저 |
| 템플릿 에셋 | `public/writespace/papex.cls` + `papex-template.tex` (`papex-latex/`에서 복사, LF 정규화), 런타임에 아카이브로 가져옴 |
| 오케스트레이션 | `src/components/writespace/writespace-client.tsx`: 세 `Tabs` + 초안 영속화 + 내보내기/게시 |
| 국제화 | `src/i18n/dictionaries/{zh,en}.ts` `writespace` 블록 (~70개 키), UI 라벨과 일치 |

---

## 9. 보안 및 제한

- **권한**: 진입과 게시 모두 로그인 필요; 새 버전 대상 논문은 현재 사용자(또는 권한 역할) 소유여야 하며 아니면 백엔드가 `FORBIDDEN`을 반환.
- **서버 측 영속화 없음**: 모든 생성과 패킹은 브라우저 메모리에서 일어납니다; 파일은 다운로드/게시를 클릭할 때만 기기를 떠납니다. 플랫폼은 여전히 TeX 샌드박스, 크기 제한, [투고 가이드 §6/§7](/en/guide/submission#6-deployment-and-ops)의 shell-escape 비활성화를 적용합니다.
- **브라우저 지원**: `CompressionStream('gzip')`은 최신 브라우저(Chrome/Edge 80+, Firefox 113+, Safari 16.4+) 필요; 없으면 친절한 메시지와 함께 내보내기 실패.
- **50MB 제한**: 게시는 `/api/submit/archive`를 거치며 동일한 50MB 상한 적용.

---

## 10. FAQ

**Q: 온라인 집필 vs 소스 패키지 업로드 — 어느 것을 쓰나요?**
둘 다 됩니다. 온라인 집필은 명령줄을 원치 않고 실시간 검증을 원하는 저자에게 적합하며, 소스 패키지 업로드는 `papex-build.py`의 세밀한 제어를 원하는 로컬 TeX 프로젝트 소유자에게 적합합니다. 둘 다 데이터베이스에 동일한 결과를 만듭니다.

**Q: 내보낸 `tar.gz`를 "소스 패키지 업로드" 페이지에서 수동으로 업로드할 수 있나요?**
네, 동일합니다. 내보낸 아카이브는 이미 `papex.cls`와 `papex-template.tex`를 번들하므로 백엔드가 `PAPEX_LATEX_DIR`에서 복사할 필요가 없습니다.

**Q: 본문에 `\cite{key}`를 썼는데 게시 후 인용이 연결되지 않나요?**
인용 연결은 참고문헌의 `doi` / `arxivId`가 플랫폼에 이미 있는 논문과 일치하는지에 달려 있습니다; `url` / `title`만 있는 항목은 인용 그래프로 가지만 내부 링크는 형성하지 않습니다. 참고문헌의 DOI / arXiv ID가 정확한지 확인하세요.

**Q: 초안이 클라우드에 동기화되나요?**
아니요. 초안은 브라우저 `localStorage`에만 있습니다; 기기를 바꾸거나 캐시를 지우면 사라집니다. **내보내기** 또는 **게시**를 습관화하세요.

**Q: 본문의 `$...$` 수식이 망가지나요?**
아니요. 섹션 `.tex`은 그대로(이스케이프 없음) 작성됩니다; 수식은 백엔드 XeLaTeX 컴파일로 렌더링됩니다. "메타데이터"의 일반 텍스트 필드만 이스케이프됩니다.

**Q: 게시 직후 PDF가 없나요?**
[투고 가이드 FAQ](/en/guide/submission#8-faq)와 동일: 서버에 TeX Live가 설정되어 있는지에 달려 있으며, 없으면 `pdfUrl`이 비고 페이지에 "PDF를 백그라운드에서 빌드 중"이라고 표시됩니다.
