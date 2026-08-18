# Guia de submissão

Este guia explica os dois métodos de submissão de artigos suportados pelo Papex e
fornece uma referência completa para a **submissão por pacote de fontes**, junto com seu
manifesto `papex.json` e a cadeia de ferramentas XeLaTeX.

---

## 1. Visão geral

O Papex oferece dois pontos de entrada de submissão para fluxos de trabalho diferentes:

| Método | Ponto de entrada | Público | Características |
| --- | --- | --- | --- |
| **Submissão por formulário** | Página web "Enviar → Formulário" / `POST /api/papers` | Submissores ocasionais | Preencha título, resumo, autores etc. no navegador; **envie o PDF de texto integral diretamente** (≤50MB) |
| **Upload de pacote de fontes** | Página web "Enviar → Pacote de fontes" / `POST /api/submit/archive` | Autores LaTeX | Empacote suas fontes com um manifesto `papex.json` em um `tar.gz`; a plataforma **cria o artigo, vincula citações e compila o PDF** automaticamente |

> Ambos os métodos compartilham a mesma lógica de ingestão (`createSubmission` + `addCitation`).
> Diferem apenas na origem dos metadados e em como o corpo/PDF são produzidos.

> **Prefere não tocar na linha de comando?** Você também pode usar o módulo integrado de
> [Autoria online](/en/guide/writespace) para editar o `papex.json` visualmente, escrever o corpo
> e "exportar `tar.gz`" ou "publicar com um clique" diretamente no navegador — o arquivo que ele
> produz é totalmente equivalente a um upload de pacote de fontes.

---

## 2. Método 1: Submissão por formulário

Clique em **Enviar** na navegação superior, escolha a aba **Formulário**, preencha os campos
e clique em "Enviar artigo":

- **Título**, **Resumo**
- **Categoria primária** (obrigatória, código da árvore de categorias, ex. `cs.LG`),
  **Categorias cruzadas** (separadas por vírgula, opcional)
- **Autores** (adicione quantos forem necessários; a ordem é a ordem de autoria)
- **Enviar PDF** (opcional): arraste e solte ou escolha um PDF (≤50MB); a plataforma o armazena
  e vincula referências automaticamente. **DOI** (opcional), **Licença** (padrão `CC-BY-4.0`),
  **Nota de versão** (opcional)

O artigo então entra na fila de revisão. A submissão por formulário é enviada como `multipart/form-data`:
`meta` é uma string JSON dos metadados, `pdf` é o arquivo PDF opcional.

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

> O PDF é opcional. Quando fornecido, o endpoint o armazena na versão do artigo,
> analisa o corpo, vincula citações na plataforma e retorna
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`. O formulário web envia isso
> automaticamente; clientes de API ainda podem fazer POST de JSON puro (sem `pdf`).

---

## 3. Método 2: Upload de pacote de fontes

O upload de pacote de fontes é um **fluxo de trabalho do autor**: você escreve o artigo em LaTeX, descreve
os metadados e as referências em um `papex.json` estruturado, empacota tudo em um
`tar.gz` e faz o upload em uma única etapa. O backend cuida de "desempacotar → validar → ingerir →
vincular citações → compilar PDF" de ponta a ponta.

### 3.1 Estrutura do pacote

Um layout de pacote mínimo, porém recomendado:

```
my-paper.tar.gz
├── papex.json            # obrigatório: manifesto do artigo (metadados + seções + referências)
├── papex-template.tex    # documento principal (use o papex-template.tex fornecido no repositório)
├── papex.cls             # classe de documento (opcional; o servidor copia de PAPEX_LATEX_DIR se ausente)
├── references.bib        # opcional: BibTeX escrito à mão; caso contrário gerado automaticamente a partir das referências
└── sections/             # seções do corpo (fragmentos .tex, referenciados em ordem pelo papex.json)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> O pacote **deve conter `papex.json`**; caso contrário o upload é rejeitado (HTTP 400).

### 3.2 Referência de campos do `papex.json`

O JSON Schema completo está em [`papex-latex/papex.schema.json`](https://github.com/).
Campos centrais e seus destinos:

| Campo | Tipo | Obrigatório | Notas / destino no BD |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | não | Se corresponder a um **artigo seu (ou do admin) existente** → enviado como uma nova versão; caso contrário um novo ID de artigo é atribuído |
| `paper.title` | string | sim | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | sim | → `paper_versions.abstract` |
| `paper.keywords` | string[] | não | Renderizado após o resumo no PDF (não armazenado separadamente) |
| `paper.primaryCategoryId` | string | sim | → `papers.primaryCategoryId`; **deve existir** na tabela de categorias ou 400 |
| `paper.secondaryCategoryIds` | string[] | não | → `paper_categories` (não primárias) |
| `paper.doi` | string | não | → `paper_versions.doi`, também escrito no grafo de citações (`target_doi`) |
| `paper.license` | string | não | → `paper_versions.license`, padrão `CC-BY-4.0` |
| `paper.versionNote` | string | não | → `paper_versions.comments` |
| `paper.subtitle` | string | não | Renderizado abaixo do título no PDF |
| `paper.venue` | string | não | Renderizado no bloco de título (ex. conferência/periódico) |
| `authors[].name` | string | sim | → `authors` + `paper_authors` (ordenado por `order`) |
| `authors[].orcid` | string | não | Nota de rodapé do autor |
| `authors[].email` | string | não | Usado como contato do autor correspondente |
| `authors[].affiliation` | string | não | **String** → resolvida para `affiliations.id` via `findOrCreateAffiliation` |
| `authors[].corresponding` | boolean | não | Nota de rodapé "Autor correspondente" |
| `authors[].equalContribution` | boolean | não | Nota de rodapé "Contribuição igual" |
| `authors[].footnote` | string | não | Nota de rodapé de texto livre |
| `references[].key` | string | sim | Chave de citação BibTeX |
| `references[].doi` / `arxivId` | string | não | Resolvida para um artigo na plataforma via `resolveTarget`; caso contrário `url`/`title` vão para `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | não | Preenche `citations` e o `references.bib` auto-gerado |
| `sections[]` | string[] | sim | Lista ordenada de caminhos `.tex` de seções; **controla apenas o LaTeX, não é armazenado em tabelas** |
| `appendices[]` | string[] | não | Lista ordenada de caminhos `.tex` de apêndices |
| `acknowledgments` / `funding` | string | não | Renderizado na seção de agradecimentos/financiamento do PDF |
| `build` | object | não | Opções de compilação: `style` (numeric/authoryear), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (campos isentos de escape), etc. |

> **Diferença em relação à submissão por formulário**: `papex.json` usa uma `affiliation` do tipo **string**
> em vez de um `affiliationId` numérico; a camada de mapeamento localiza ou cria a
> linha em `affiliations`. Ela também adiciona os campos exclusivos do LaTeX `sections`, `references`,
> `appendices`, `build`.

### 3.3 Cadeia de ferramentas XeLaTeX (`papex-latex/`)

Uma cadeia de ferramentas XeLaTeX dedicada é fornecida em [`papex-latex/`](https://github.com/):

```
papex-latex/
├── papex.cls              # classe de documento (ctex + authblk + biblatex, CJK+inglês, macros de metadados, cabeçalho/rodapé)
├── papex-template.tex     # documento principal, faz \input automático dos _papex_*.tex e seções gerados
├── papex-build.py         # buildador sem dependências (apenas stdlib; jsonschema opcional)
├── papex.schema.json      # contrato de manifesto draft-07
├── latexmkrc              # configuração opcional do latexmk
├── README.md              # uso da cadeia de ferramentas
└── example/               # pacote de exemplo completo (artigo em chinês + 5 seções + apêndice)
```

**Destaques do `papex.cls`**

- **CJK + inglês**: baseado em `ctex` (`scheme=plain`), `fontset=fandol` padrão (incluso
  no TeX Live, compila no servidor pronto para uso); mude localmente com
  `windows` / `mac` / `ubuntu`.
- **Autores/afiliações**: `authblk` com afiliações compartilhadas, notas de rodapé de autor
  correspondente e de contribuição igual.
- **Referências**: `biblatex` + `biber`, `numeric` / `authoryear` selecionável.
- **Macros de metadados**: `\papexPaperId` (ID do artigo acima do título), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (link automático doi.org), `\papexVersionNote`, `\papexKeywords`
  (após o resumo), `\papexLicense` (rodapé), `\papexRunningTitle` (cabeçalho).
- **Independente de marca**: sem menções a *preprints / arXiv*, consistente com a
  convenção de produto "livre de arXiv".

**Fluxo de trabalho do `papex-build.py`**

1. Lê `papex.json` (a entrada pode ser um diretório / um json único / `.tar.gz`).
2. Valida (prefere `jsonschema`, senão verificações internas).
3. Escapa campos de texto puro (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …), gerando `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` e
   `references.bib` (ignorado se o arquivo já traz `references.bib`).
4. Compila com `latexmk -xelatex` (`--emit-only` emite apenas intermediários,
   `--validate` valida apenas).
5. Arquivos de seção `.tex` são escritos à mão pelo autor e suportam LaTeX completo
   (incluindo matemática); eles **não são escapados**. Use `build.passthrough` para isentar
   campos de texto JSON do escape.

### 3.4 Pré-visualização e compilação local

```bash
# entra no pacote de exemplo
cd papex-latex/example

# emite apenas .tex/.bib intermediários (sem TeX necessário — útil para inspecionar escape/estrutura)
python3 ../papex-build.py . --emit-only

# valida apenas o papex.json
python3 ../papex-build.py . --validate

# gera e compila o PDF (requer um TeX Live local)
python3 ../papex-build.py .
```

Empacote e envie:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Upload no site

1. Após entrar, clique em **Enviar** na navegação superior e escolha a aba
   **Pacote de fontes**.
2. Arraste o `tar.gz` para a zona de soltura, ou clique para escolher um arquivo (apenas `.tar.gz` /
   `.tgz`, ≤ 50MB).
3. Clique em "Enviar & submeter"; a plataforma retorna o ID e a versão do artigo, com
   notas de processamento (ex. PDF sendo compilado em segundo plano).
4. Clique em "Ver artigo" para ir para a página do artigo recém-criado.

---

## 4. Processamento ponta a ponta (backend)

Após o upload, o backend processa o pacote da seguinte forma (código em
`src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     gunzip sem dependências + parser ustar/GNU/PAX, proteção contra path traversal
                         │
                         ▼
                  ② lê papex.json → coerceManifest() valida campos obrigatórios
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId deve existir (senão 400)
                     · string affiliation → affiliations.id (findOrCreateAffiliation)
                     · paper.id corresponde a artigo próprio/privilegiado → nova versão
                         │
                         ▼
                  ④ createSubmission() ingere (reutiliza a transação existente)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() vincula o grafo de citações
                         │
                         ▼
                  ⑥ compilação XeLaTeX opcional (latexmk do servidor)
                     → savePdfBuffer() armazena → atualiza paper_versions.pdfUrl
                     (latexmk ausente → apenas aviso, ingestão não afetada)
                         │
                         ▼
                 retorna { paperId, version, warnings, pdfUrl? }
```

**Módulos principais**

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/latex/tar.ts` | `gunzip` + `parseTar` sem dependências (ustar / nomes longos GNU / cabeçalhos estendidos PAX), `writeEntries` com proteção contra path traversal |
| `src/lib/latex/papex-json.ts` | tipos `PapexManifest`, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | orquestração de `processSubmissionArchive`; `buildAndStorePdf` sonda `latexmk` e compila/armazena o PDF |
| `src/app/api/submit/archive/route.ts` | Aceita `multipart/form-data` `file` (≤50MB), autentica, mapeia erros para status HTTP |

**Mapeamento de códigos de erro (HTTP)**

| Erro interno | HTTP | Significado |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | Arquivo sem `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` não é um JSON válido |
| `MANIFEST_INVALID:…` | 400 | Campo obrigatório ausente (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | Código de categoria não existe |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | Arquivo corrompido ou vazio |
| `FORBIDDEN` | 403 | Não autorizado a submeter uma nova versão desse artigo |
| `PAPER_NOT_FOUND` | 404 | O artigo de destino declarado para a nova versão não existe |
| outro | 500 | Erro interno (incl. `ID_GENERATION_FAILED`) |

---

## 5. Referência de API

### `POST /api/papers`

Endpoint de submissão por formulário. A requisição é `multipart/form-data` (veja
[Seção 2](#2-method-1-form-submission)): o campo `meta` é uma string JSON dos metadados,
o campo `pdf` é o arquivo PDF opcional (≤50MB). Requer autenticação. Retorna `{ paperId, version }`,
e, quando um PDF foi enviado, um adicional `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
Clientes de API também podem fazer POST de JSON puro (sem `pdf`).

### `POST /api/submit/archive`

Endpoint de pacote de fontes.

- **Auth**: obrigatória (cookie).
- **Requisição**: `multipart/form-data`, campo `file` é o `tar.gz` (≤ 50MB).
- **Sucesso (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **Falha**: JSON com a mensagem de erro correspondente; códigos de status conforme a
  [tabela de erros](#4-end-to-end-processing-backend).

---

## 6. Implantação e operações

- **TeX Live**: o servidor precisa de `texlive` (com `xelatex`, `biber`, `latexmk`) e
  `collection-langchinese` para que as fontes `fandol` estejam disponíveis.
- **Variáveis de ambiente**:
  - `PAPEX_LATEX_BIN`: caminho para o latexmk (padrão `PATH`).
  - `PAPEX_LATEX_DIR`: diretório que contém `papex.cls`; copiado quando o arquivo o omite.
- **Sandbox e recursos**: execute a compilação LaTeX em um ambiente isolado com
  limites de CPU/memória/timeout, e **desative `\write18` (shell-escape)** e o acesso
  de rede para impedir que fontes maliciosas executem comandos.
- **Assíncrono**: a compilação é lenta; em produção prefira uma **fila assíncrona**
  (retorna o `paperId` imediatamente, callback para atualizar `pdfUrl` quando o PDF ficar pronto)
  para não bloquear a requisição.
- **Degradação lors de ausência**: se `latexmk` não estiver disponível, o `processSubmissionArchive`
  registra `warnings` e pula a compilação do PDF; a ingestão e a vinculação de citações ainda funcionam.
- **Armazenamento de PDF**: reutiliza `savePdfBuffer` (rota de streaming
  `/api/papers/{id}/pdf/{version}`); nenhuma nova camada de armazenamento é necessária.

---

## 7. Segurança

- **Path traversal**: `writeEntries` valida o caminho real de cada entrada com
  `path.relative`, rejeitando `..` e caminhos absolutos; `parseTar` remove o `./` inicial.
- **Limite de tamanho**: a rota limita `file` a ≤ 50MB.
- **Abuso de recursos**: a compilação tem limites de timeout/recursos; considere um
  rate limit por usuário.
- **shell-escape**: o comando de compilação não passa `-shell-escape`, impedindo que
  as fontes executem comandos do sistema.

---

## 8. FAQ

**P: O pacote de fontes duplica dados da submissão por formulário?**
Não. Ambos compartilham a mesma lógica de ingestão; apenas a origem dos metadados difere.

**P: Preciso usar o template XeLaTeX?**
`papex.cls` e `papex-template.tex` determinam o layout final do PDF; você só escreve os
arquivos de seção `.tex` e o `papex.json`. Se o arquivo omitir `papex.cls`, o servidor usa
o do `PAPEX_LATEX_DIR`.

**P: Posso usar matemática, figuras e comandos personalizados nas seções?**
Sim. Arquivos de seção `.tex` são escritos à mão e suportam LaTeX completo, **sem escape**. Coloque
comandos de preâmbulo personalizados nos arquivos de seção ou em `papex-template.tex`.

**P: Não vejo um PDF logo após a submissão?**
Se o TeX Live não estiver configurado no servidor, `pdfUrl` fica vazio e a página informa "PDF está
sendo compilado em segundo plano." Configure-o e reenvie; em produção, associe-o a uma fila assíncrona.

**P: Como envio uma nova versão de um artigo?**
Defina `paper.id` no `papex.json` para o ID existente do seu artigo (e você precisa ter
permissão de submissão sobre ele); a plataforma o ingere como uma nova versão.

**P: Como as citações são vinculadas automaticamente?**
`doi` / `arxivId` no array `references` são resolvidos para artigos na plataforma via
`resolveTarget` e uma aresta de citação é criada; outras entradas são armazenadas como
`url` / `title` no grafo de citações.
