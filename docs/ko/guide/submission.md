# 투고 가이드

이 가이드는 Papex가 지원하는 두 가지 논문 투고 방법을 설명하고, **소스 패키지 투고**와 그 `papex.json` 매니페스트 및 XeLaTeX 툴체인에 대한 완전한 참조를 제공합니다.

---

## 1. 개요

Papex는 워크플로우에 따라 두 가지 투고 진입점을 제공합니다:

| 방법 | 진입점 | 대상 | 특징 |
| --- | --- | --- | --- |
| **폼 투고** | 웹 "제출 → 폼" 페이지 / `POST /api/papers` | 가끔 투고하는 사람 | 브라우저에서 제목·초록·저자 등을 입력하고 **전문 PDF를 직접 업로드**(≤50MB) |
| **소스 패키지 업로드** | 웹 "제출 → 소스 패키지" 페이지 / `POST /api/submit/archive` | LaTeX 저자 | `papex.json` 매니페스트와 소스를 `tar.gz`로 묶으면 플랫폼이 **논문 생성, 인용 연결, PDF 빌드**를 자동 수행 |

> 두 방법 모두 동일한 수집 로직(`createSubmission` + `addCitation`)을 공유합니다.
> 다른 점은 메타데이터가 어디서 오는지, 본문/PDF가 어떻게 만들어지는지뿐입니다.

> **명령줄을 다루고 싶지 않으신가요?** 내장된 [온라인 집필](/en/guide/writespace) 모듈을 사용해 `papex.json`을 시각적으로 편집하고 본문을 작성한 뒤, 브라우저에서 바로 "tar.gz 내보내기" 또는 "한 번에 게시"를 할 수 있습니다. 이렇게 만들어진 아카이브는 소스 패키지 업로드와 완전히 동일합니다.

---

## 2. 방법 1: 폼 투고

상단 내비게이션에서 **제출**을 클릭하고 **폼** 탭을 선택한 뒤 필드를 채우고 "논문 제출"을 클릭합니다:

- **제목**, **초록**
- **주 분류**(필수, 분류 트리의 코드 예: `cs.LG`), **교차 분류**(쉼표로 구분, 선택)
- **저자**(필요한 만큼 추가; 순서는 저자 순서)
- **PDF 업로드**(선택): PDF를 드래그 앤 드롭하거나 선택(≤50MB); 플랫폼이 저장하고
  참고문헌을 자동 연결. **DOI**(선택), **라이선스**(기본 `CC-BY-4.0`),
  **버전 메모**(선택)

그러면 논문이 리뷰 대기열로 들어갑니다. 폼 투고는 `multipart/form-data`로 전송됩니다:
`meta`는 메타데이터의 JSON 문자열, `pdf`는 선택적 PDF 파일입니다.

```http
POST /api/papers
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="meta"

{"title":"…","abstract":"…","primaryCategoryId":"cs.LG","secondaryCategoryIds":["stat.ML"],"authors":[{"name":"Ming Zhang","order":0}],"doi":"","license":"CC-BY-4.0","comments":"","basePaperId":null}
--boundary
Content-Disposition: form-data; name="pdf"; filename="paper.pdf"
Content-Type: application/pdf

<binary PDF data>
--boundary--
```

> PDF는 선택 사항입니다. 제공하면 엔드포인트가 해당 논문 버전에 저장하고,
> 본문을 파싱하며 플랫폼 내 인용을 연결하고
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`를 반환합니다. 웹 폼은 이것을
> 자동으로 전송하며, API 클라이언트는 여전히( `pdf` 없이) 일반 JSON을 POST할 수 있습니다.

---

## 3. 방법 2: 소스 패키지 업로드

소스 패키지 업로드는 **저자 워크플로우**입니다. LaTeX로 논문을 작성하고 구조화된 `papex.json`에 메타데이터와 참고문헌을 기술한 뒤, 모든 것을 `tar.gz`로 묶어 한 번에 업로드합니다. 백엔드는 "풀기 → 검증 → 수집 → 인용 연결 → PDF 빌드"를 끝까지 처리합니다.

### 3.1 패키지 구조

최소하지만 권장되는 패키지 레이아웃:

```
my-paper.tar.gz
├── papex.json            # 필수: 논문 매니페스트 (메타데이터 + 섹션 + 참고문헌)
├── papex-template.tex    # 메인 문서 (저장소 제공 papex-template.tex 사용)
├── papex.cls             # 문서 클래스 (선택; 없으면 서버가 PAPEX_LATEX_DIR에서 복사)
├── references.bib        # 선택: 직접 작성한 BibTeX; 없으면 references에서 자동 생성
└── sections/             # 본문 섹션 (.tex 조각, papex.json에서 순서대로 참조)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> 패키지에는 **`papex.json`이 반드시 포함**되어야 하며, 그렇지 않으면 업로드가 거부됩니다(HTTP 400).

### 3.2 `papex.json` 필드 참조

전체 JSON 스키마는 [`papex-latex/papex.schema.json`](https://github.com/)에 있습니다.
핵심 필드와 그 대상:

| 필드 | 타입 | 필수 | 비고 / DB 대상 |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | no | 본인(또는 관리자)의 기존 논문과 일치하면 → 새 버전으로 제출; 그렇지 않으면 새 논문 ID가 할당 |
| `paper.title` | string | yes | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | yes | → `paper_versions.abstract` |
| `paper.keywords` | string[] | no | PDF에서 초록 뒤에 렌더링됨 (별도 저장 안 됨) |
| `paper.primaryCategoryId` | string | yes | → `papers.primaryCategoryId`; 분류 테이블에 **존재해야** 하며 아니면 400 |
| `paper.secondaryCategoryIds` | string[] | no | → `paper_categories` (비주 분류) |
| `paper.doi` | string | no | → `paper_versions.doi`, 인용 그래프(`target_doi`)에도 기록 |
| `paper.license` | string | no | → `paper_versions.license`, 기본 `CC-BY-4.0` |
| `paper.versionNote` | string | no | → `paper_versions.comments` |
| `paper.subtitle` | string | no | PDF에서 제목 아래에 렌더링 |
| `paper.venue` | string | no | 제목 블록에 렌더링 (예: 학회/저널) |
| `authors[].name` | string | yes | → `authors` + `paper_authors` (`order` 순) |
| `authors[].orcid` | string | no | 저자 각주 |
| `authors[].email` | string | no | 교신저자 연락처로 사용 |
| `authors[].affiliation` | string | no | **문자열** → `findOrCreateAffiliation`로 `affiliations.id`에 대응 |
| `authors[].corresponding` | boolean | no | "교신저자" 각주 |
| `authors[].equalContribution` | boolean | no | "공동 기여" 각주 |
| `authors[].footnote` | string | no | 자유 형식 각주 |
| `references[].key` | string | yes | BibTeX 인용 키 |
| `references[].doi` / `arxivId` | string | no | `resolveTarget`로 플랫폼 내 논문에 대응; 아니면 `url`/`title`이 `citations`로 |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | no | `citations`와 자동 생성된 `references.bib` 채움 |
| `sections[]` | string[] | yes | 섹션 `.tex` 경로의 순서 목록; **LaTeX만 구동, 테이블에는 저장 안 됨** |
| `appendices[]` | string[] | no | 부록 `.tex` 경로의 순서 목록 |
| `acknowledgments` / `funding` | string | no | PDF의 감사/펀딩 섹션에 렌더링 |
| `build` | object | no | 빌드 옵션: `style` (numeric/authoryear), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (이스케이프 면제 필드) 등 |

> **폼 투고와의 차이**: `papex.json`은 숫자 `affiliationId` 대신 `affiliation` **문자열**을 사용합니다; 매핑 계층이 `affiliations` 행을 찾거나 생성합니다. 또한 LaTeX 전용 필드 `sections`, `references`, `appendices`, `build`가 추가됩니다.

### 3.3 XeLaTeX 툴체인 (`papex-latex/`)

전용 XeLaTeX 툴체인이 [`papex-latex/`](https://github.com/)에 제공됩니다:

```
papex-latex/
├── papex.cls              # 문서 클래스 (ctex + authblk + biblatex, CJK+영어, 메타데이터 매크로, 헤더/푸터)
├── papex-template.tex     # 메인 문서, 생성된 _papex_*.tex와 섹션을 자동 \input
├── papex-build.py         # 의존성 없는 빌더 (표준 라이브러리만; jsonschema 선택)
├── papex.schema.json      # draft-07 매니페스트 계약
├── latexmkrc              # 선택 latexmk 설정
├── README.md              # 툴체인 사용법
└── example/               # 전체 예제 패키지 (중국어 논문 + 5개 섹션 + 부록)
```

**`papex.cls` 하이라이트**

- **CJK + 영어**: `ctex`(`scheme=plain`) 기반, 기본 `fontset=fandol` (TeX Live에 번들되어 서버에서 즉시 컴파일); 로컬에서는 `windows` / `mac` / `ubuntu`로 전환.
- **저자/소속**: 공유 소속을 갖춘 `authblk`, 교신저자 및 공동 기여 각주.
- **참고문헌**: `biblatex` + `biber`, `numeric` / `authoryear` 선택 가능.
- **메타데이터 매크로**: `\papexPaperId` (제목 위 논문 ID), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (자동 doi.org 링크), `\papexVersionNote`, `\papexKeywords`
  (초록 뒤), `\papexLicense` (푸터), `\papexRunningTitle` (헤더).
- **브랜드 독립**: *preprints / arXiv* 같은 표현 없이, "arXiv-free" 제품 규칙과 일치.

**`papex-build.py` 워크플로우**

1. `papex.json` 읽기 (입력은 디렉터리 / 단일 json / `.tar.gz` 가능).
2. 검증 (가능하면 `jsonschema`, 아니면 내장 검사).
3. 일반 텍스트 필드(`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …) 이스케이프, `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` 및
   `references.bib` 생성 (아카이브에 이미 `references.bib`가 있으면 생략).
4. `latexmk -xelatex`로 컴파일 (`--emit-only`는 중간 파일만 생성,
   `--validate`는 검증만).
5. 섹션 `.tex` 파일은 저자가 직접 작성하며 전체 LaTeX(수식 포함)를 지원하고
   **이스케이프되지 않습니다**. `build.passthrough`로 JSON 텍스트 필드의 이스케이프를 면제하세요.

### 3.4 로컬 미리보기 및 빌드

```bash
# 예제 패키지로 들어가기
cd papex-latex/example

# 중간 .tex/.bib만 생성 (TeX 불필요 — 이스케이프/구조 확인에 유용)
python3 ../papex-build.py . --emit-only

# papex.json만 검증
python3 ../papex-build.py . --validate

# PDF 생성 및 컴파일 (로컬 TeX Live 필요)
python3 ../papex-build.py .
```

묶어서 제출:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 웹사이트에서 업로드

1. 로그인 후 상단 내비게이션의 **제출**을 클릭하고 **소스 패키지** 탭을 선택합니다.
2. `tar.gz`를 드롭 영역으로 끌어다 놓거나 클릭하여 파일 선택 (`.tar.gz` /
   `.tgz`만, ≤ 50MB).
3. "업로드 및 제출"을 클릭하면 플랫폼이 논문 ID와 버전, 처리 메모(예: PDF를 백그라운드에서 빌드 중)를 반환합니다.
4. "논문 보기"를 클릭해 새로 생성된 논문 페이지로 이동합니다.

---

## 4. 엔드투엔드 처리 (백엔드)

업로드 후 백엔드는 다음과 같이 패키지를 처리합니다 (소스는 `src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     zero-dep gunzip + ustar/GNU/PAX 파서, 경로 순회 방지
                         │
                         ▼
                  ② read papex.json → coerceManifest() 필수 필드 검증
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId는 반드시 존재 (아니면 400)
                     · affiliation 문자열 → affiliations.id (findOrCreateAffiliation)
                     · paper.id가 본인/권한 보유 논문과 일치 → 새 버전
                         │
                         ▼
                  ④ createSubmission() 수집 (기존 트랜잭션 재사용)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() 인용 그래프 연결
                         │
                         ▼
                  ⑥ 선택 XeLaTeX 빌드 (서버 latexmk)
                     → savePdfBuffer() 저장 → paper_versions.pdfUrl 갱신
                     (latexmk 누락 → 경고만, 수집에는 영향 없음)
                         │
                         ▼
                 returns { paperId, version, warnings, pdfUrl? }
```

**핵심 모듈**

| 파일 | 책임 |
| --- | --- |
| `src/lib/latex/tar.ts` | 의존성 없는 `gunzip` + `parseTar` (ustar / GNU 긴 이름 / PAX 확장 헤더), 경로 순회 방지 `writeEntries` |
| `src/lib/latex/papex-json.ts` | `PapexManifest` 타입, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | `processSubmissionArchive` 오케스트레이션; `buildAndStorePdf`가 `latexmk`를 탐지해 컴파일/저장 |
| `src/app/api/submit/archive/route.ts` | `multipart/form-data` `file` (≤50MB) 수신, 인증, 오류를 HTTP 상태로 매핑 |

**오류 코드 매핑 (HTTP)**

| 내부 오류 | HTTP | 의미 |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | 아카이브에 `papex.json` 누락 |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json`이 유효한 JSON이 아님 |
| `MANIFEST_INVALID:…` | 400 | 필수 필드 누락 (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | 분류 코드가 존재하지 않음 |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | 아카이브가 손상되거나 비어 있음 |
| `FORBIDDEN` | 403 | 해당 논문의 새 버전을 제출할 권한 없음 |
| `PAPER_NOT_FOUND` | 404 | 선언한 새 버전 대상 논문이 존재하지 않음 |
| 기타 | 500 | 내부 오류 (incl. `ID_GENERATION_FAILED`) |

---

## 5. API 참조

### `POST /api/papers`

폼 투고 엔드포인트. 요청은 `multipart/form-data` ([2절](#2-method-1-form-submission) 참조): 필드 `meta`는 메타데이터의 JSON 문자열, 필드 `pdf`는 선택적 PDF 파일(≤50MB). 인증 필요. `{ paperId, version }` 반환, PDF가 업로드되면 추가로 `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
API 클라이언트는 `pdf` 없이 일반 JSON을 POST할 수도 있습니다.

### `POST /api/submit/archive`

소스 패키지 엔드포인트.

- **인증**: 필요 (쿠키).
- **요청**: `multipart/form-data`, 필드 `file`은 `tar.gz` (≤ 50MB).
- **성공 (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **실패**: 해당 오류 메시지가 담긴 JSON; 상태 코드는 [오류 표](#4-end-to-end-processing-backend) 참조.

---

## 6. 배포 및 운영

- **TeX Live**: 서버에는 `texlive` (xelatex, biber, latexmk 포함)와 `fandol` 폰트를 사용할 수 있도록 `collection-langchinese`가 필요합니다.
- **환경 변수**:
  - `PAPEX_LATEX_BIN`: latexmk 경로 (기본 `PATH`).
  - `PAPEX_LATEX_DIR`: `papex.cls`를 보관한 디렉터리; 아카이브에 없을 때 복사.
- **샌드박스 및 자원**: LaTeX 컴파일을 격리된 환경에서 CPU/메모리/타임아웃 제한과 함께 실행하고, 악의적인 소스가 명령을 실행하지 못하도록 **`\write18` (shell-escape) 및 네트워크 접근을 비활성화**하세요.
- **비동기**: 컴파일은 느리므로, 운영에서는 즉시 `paperId`를 반환하고 PDF 준비 완료 시 콜백으로 `pdfUrl`을 갱신하는 **비동기 큐**를 권장합니다(요청 차단 방지).
- **누락 폴백**: `latexmk`를 사용할 수 없으면 `processSubmissionArchive`가 `warnings`를 기록하고 PDF 빌드를 건너뜁니다; 수집과 인용 연결은 여전히 동작합니다.
- **PDF 저장**: `savePdfBuffer` (`/api/papers/{id}/pdf/{version}` 스트리밍 라우트) 재사용; 새로운 저장 계층 불필요.

---

## 7. 보안

- **경로 순회**: `writeEntries`가 각 항목의 실제 경로를 `path.relative`로 검증해 `..`와 절대 경로를 거부; `parseTar`가 선행 `./`를 제거.
- **크기 제한**: 라우트가 `file`을 ≤ 50MB로 제한.
- **자원 남용**: 컴파일에 타임아웃/자원 제한; 사용자별 속도 제한 고려.
- **shell-escape**: 컴파일 명령이 `-shell-escape`를 전달하지 않아 소스가 시스템 명령을 실행하지 못함.

---

## 8. FAQ

**Q: 소스 패키지가 폼 투고 데이터와 중복되나요?**
아니요. 둘은 동일한 수집 로직을 공유하며 메타데이터 출처만 다릅니다.

**Q: 반드시 XeLaTeX 템플릿을 써야 하나요?**
`papex.cls`와 `papex-template.tex`이 최종 PDF 레이아웃을 결정합니다; 여러분은 섹션 `.tex` 파일과 `papex.json`만 작성하면 됩니다. 아카이브에 `papex.cls`가 없으면 서버가 `PAPEX_LATEX_DIR`의 것을 사용합니다.

**Q: 섹션에 수식·그림·사용자 정의 명령을 쓸 수 있나요?**
네. 섹션 `.tex` 파일은 직접 작성되며 **이스케이프되지 않은** 전체 LaTeX를 지원합니다. 사용자 정의 프리앰블 명령은 섹션 파일이나 `papex-template.tex`에 넣으세요.

**Q: 제출 직후 PDF가 보이지 않나요?**
서버 측에 TeX Live가 설정되지 않았으면 `pdfUrl`이 비고 페이지에 "PDF를 백그라운드에서 빌드 중"이라고 표시됩니다. 설정 후 다시 제출하세요; 운영에서는 비동기 큐와 함께 사용하세요.

**Q: 논문의 새 버전은 어떻게 제출하나요?**
`papex.json`의 `paper.id`를 기존 논문 ID로 설정하세요(해당 논문에 투고 권한이 있어야 함); 플랫폼이 새 버전으로 수집합니다.

**Q: 인용은 어떻게 자동 연결되나요?**
`references` 배열의 `doi` / `arxivId`는 `resolveTarget`로 플랫폼 내 논문에 대응되고 인용 엣지가 생성됩니다; 나머지 항목은 인용 그래프에 `url` / `title`로 저장됩니다.
