# Autoria online (Writespace)

Este guia cobre o módulo de **autoria online** integrado ao Papex (ponto de entrada
`/writespace`) — uma escrivaninha baseada no navegador que não requer instalação local de TeX nem
JSON escrito à mão. Ele leva o fluxo de ["upload de pacote de fontes"](/en/guide/submission) do
Guia de submissão diretamente para o navegador: você preenche os metadados e escreve
o corpo online, e o sistema gera um `papex.json` compatível mais os arquivos de seção `.tex`.
Você pode então **exportar um `tar.gz`** ou **publicar na plataforma com um clique**.

---

## 1. Visão geral

### 1.1 Que pontos problemáticos ele resolve

| Ponto problemático do clássico "upload de pacote de fontes" | O que a autoria online faz |
| --- | --- |
| Escrever `papex.json` à mão é propenso a erros (campos ausentes, formato incorreto) | Editor visual + validação em tempo real |
| Verificar a estrutura exige instalação local de Python / TeX | O `.tex` intermediário é gerado no navegador — sem cadeia de ferramentas local |
| Empacotar e enviar são duas etapas separadas | "Exportar" e "Publicar" em um único clique a partir do editor |
| Perder o trabalho no meio da redação | Auto-salvo no `localStorage` do navegador |

### 1.2 As três abas

| Aba | Propósito |
| --- | --- |
| **Metadados** | Informações do artigo, autores, referências, opções de compilação — um editor visual do `papex.json` |
| **Corpo** | Bancada estruturada de seções / apêndices para escrever o texto do corpo em LaTeX |
| **Exportar e Publicar** | Validação em tempo real, pré-visualização do arquivo, exportar `tar.gz` / publicar com um clique |

### 1.3 Relação com o sistema de submissão

A autoria online **não** é um novo método de submissão — é a **interface de redação**
do "upload de pacote de fontes". O arquivo que ela produz é compatível byte a byte com o
[upload de pacote de fontes](/en/guide/submission#3-method-2-source-package-upload), e a publicação
reutiliza o mesmo endpoint de backend `POST /api/submit/archive`, seguindo o mesmo
pipeline "desempacotar → validar → criar artigo → vincular grafo de citações → compilar PDF"
(veja [Guia de submissão §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 2. Ponto de entrada e permissões

- **Ponto de entrada**: `/writespace`.
- **Auth em nível de página**: o componente de servidor `src/app/writespace/page.tsx` chama
  `getCurrentUser()` e faz `redirect("/login")` quando não autenticado.
- **Middleware**: `src/middleware.ts` adiciona `/writespace` a `PROTECTED_PREFIXES` e adiciona
  `/writespace/:path*` ao `matcher`, bloqueando requisições não autenticadas na borda.
- **Permissão de publicação**: publicar é, fundamentalmente, um envio de pacote de fontes e está sujeito
  às mesmas regras `FORBIDDEN` / `PAPER_NOT_FOUND` do
  [Guia de submissão §4](/en/guide/submission#4-end-to-end-processing-flow-backend) — quando
  `paper.id` declara uma nova versão, você precisa ter permissão de submissão sobre esse artigo.

---

## 3. Aba um: Editor de metadados

A aba **Metadados** corresponde a `MetadataEditor`. Ela divide os blocos
`paper` / `authors` / `references` / `build` do `papex.json` em formulários em estilo de cartão, com
campos alinhados um a um à [referência de campos do Guia de submissão §3.2](/en/guide/submission#32-papexjson-field-reference).

### 3.1 Informações do artigo (`metaPaper`)

Título, subtítulo, resumo, palavras-chave (separadas por vírgula), categoria primária (dropdown, obrigatória),
categorias secundárias (adicionar/remover), DOI, licença (dropdown, padrão `CC-BY-4.0`), venue,
nota de versão, idioma, ID do artigo (opcional — se preenchido e pertencer a um de seus artigos
existentes, enviado como nova versão).

### 3.2 Autores (`metaAuthors`)

- Adicione vários autores; cada cartão suporta reordenar para cima / para baixo / remover.
- Campos: nome (obrigatório), afiliação, e-mail, ORCID (verificado de formato), homepage, alternância de
  autor correspondente, alternância de contribuição igual, nota de rodapé, ordem.
- Autor correspondente / contribuição igual / nota de rodapé são renderizados como notas `\thanks` no PDF;
  ORCID e homepage também aparecem nas notas de rodapé.

### 3.3 Referências (`metaReferences`)

- Adicione várias entradas BibTeX; os campos incluem chave de citação (obrigatória, verificada de formato), tipo
  (dropdown, 12 tipos BibTeX), título, autor, periódico, booktitle, ano, DOI, URL, arXiv ID,
  páginas, volume, número, editora, nota.
- Dois propósitos: ① no momento da publicação, vinculadas ao grafo de citações da plataforma via
  `mapReferencesToCitations`; ② no momento da exportação, usadas para auto-gerar `references.bib`
  (veja [§7](#7-exported-archive-structure)).

### 3.4 Opções de compilação (`metaBuild`)

- Estilo de bibliografia: `numeric` / `authoryear` (injetado no documento principal como
  `\documentclass[11pt,bibstyle=authoryear]`).
- Colunas: `1` / `2` (duas colunas injeta `twocolumn`).
- Outras opções de `build` (ex. `fontset`, `documentclass`) são reservadas para a
  compilação no servidor; padrões veja `createDefaultDraft`.

### 3.5 Validação em tempo real

Cada edição passa por `validateDraft()` (`src/lib/writespace/manifest.ts`); o resultado é
compartilhado com a aba **Exportar e Publicar**. Regras centrais:

| Verificação | Regra | Tipo |
| --- | --- | --- |
| `schemaVersion` | deve corresponder a `x.y.z` | erro |
| `paper.title` / `abstract` / `primaryCategoryId` | obrigatório e não vazio | erro |
| `paper.id` (opcional) | se presente deve corresponder a `YYMM.NNNNN` | erro |
| `authors` | pelo menos 1; cada `name` obrigatório; `orcid` deve corresponder a `0000-0000-0000-0000` | erro |
| `sections` | pelo menos 1; cada `file` obrigatório; `id` apenas letras, dígitos, `-`, `_` | erro |
| `references` | cada `key` obrigatória, limitada a `A-Za-z0-9_:+.-`; `year` ∈ [0, 3000] | erro |
| corpo de seção vazio | aviso | warning |

> "erros" bloqueiam a publicação; "avisos" (ex. um corpo de seção vazio) são apenas advisórios.

---

## 4. Aba dois: Bancada de corpo

A aba **Corpo** corresponde a `SectionsEditor` e gerencia o corpo e os apêndices do artigo
estruturalmente.

### 4.1 Lista de seções

- Cada seção (ou apêndice) é um cartão recolhível com: id/nome de arquivo (`file`, ex.
  `sections/intro.tex`), título da seção, nível (`section` / `subsection` / `subsubsection` /
  `chapter` / `part`), corpo (área de texto LaTeX), contagem de caracteres.
- Suporta: adicionar seção, adicionar apêndice, mover para cima / baixo, remover.
- O nível determina o comando emitido na exportação (`\section{Title}` → `\input{sections/intro.tex}`).

### 4.2 Regras de conteúdo do corpo

- O `.tex` de seção é escrito à mão e suporta **LaTeX completo**: matemática, figuras, comandos
  personalizados e referências `\cite{key}` (correspondentes às chaves de referência).
- O corpo da seção **não é escapado** (consistente com o
  [Guia de submissão §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)); apenas
  os campos de texto puro em "Metadados" são escapados.
- Um botão "Inserir seções de exemplo" escreve cinco seções de demonstração (introdução / trabalhos relacionados /
  método / experimentos / conclusão) com fórmulas LaTeX, para um início rápido.

### 4.3 Apêndices

As entradas de apêndice compartilham a estrutura de seção e são emitidas após um único `\appendix`.

---

## 5. Aba três: Exportar e Publicar

A aba **Exportar e Publicar** corresponde a `ExportPanel` — a saída de todo o fluxo.

### 5.1 Status de validação

Mostra o resultado ao vivo de `validateDraft()` no topo: "válido" ou "inválido" mais uma lista de
erros/avisos. O botão **Publicar** fica desabilitado enquanto houver erros.

### 5.2 Pré-visualização do manifesto de arquivos

Mostra os arquivos do pacote que serão produzidos (ou seja, a saída de `buildArchiveFiles`,
[§7](#7-exported-archive-structure)), para que você possa confirmar a estrutura antes de baixar/publicar.

### 5.3 Exportar `tar.gz`

Clique em **Exportar**: um `tar.gz` é gerado inteiramente no navegador e dispara um download
(nome de arquivo a partir de i18n `writespace.expDownloadName`).

- Totalmente **sem dependências**: `src/lib/writespace/targz.ts` implementa manualmente o empacotamento POSIX ustar
  mais o nativo `CompressionStream('gzip')` — nenhum backend envolvido.
- Os assets de template (`papex-template.tex` / `papex.cls`) são buscados no momento da exportação de
  `/writespace/papex-template.tex` e `/writespace/papex.cls` e empacotados no arquivo,
  mantendo-o **autossuficiente** (o backend compila diretamente via `latexmk`).

### 5.4 Publicar com um clique

Clique em **Publicar**: executa as mesmas etapas de geração da exportação, depois faz `POST` do `tar.gz` como
o campo `file` de uma requisição `multipart/form-data` para `/api/submit/archive`.

- Publicar requer `validation.valid === true` antecipadamente.
- Em caso de sucesso, mostra o "ID do artigo + versão" retornado e `warnings`, com um link "ver artigo",
  e limpa a flag de rascunho local.
- Em caso de falha, mostra a mensagem de erro do backend inline (mapeamento no
  [tabela de erros do Guia de submissão §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 6. Auto-salvar e restaurar rascunho

- O rascunho (`manifest` + corpo por seção) auto-salva no `localStorage` do navegador
  (chave: `papex-writespace-draft`), com debounce de 400ms — sobrevive ao fechamento da página.
- Reabrir `/writespace` restaura o último rascunho automaticamente e mostra "rascunho local restaurado";
  após editar, mostra "auto-salvo".
- O botão **Novo** no topo pede confirmação, limpa o `localStorage` e reinicia um
  rascunho em branco (com uma seção de introdução de exemplo).

> Os rascunhos vivem apenas no navegador local; trocar de dispositivo ou limpar os dados do navegador os perde.
> Para trabalhos importantes, lembre-se de **Exportar** ou **Publicar**.

---

## 7. Estrutura do arquivo exportado

O `tar.gz` produzido por **Exportar / Publicar** é montado por `buildArchiveFiles()` e é
totalmente compatível com o que o backend `papex-archive.ts` espera:

```
my-paper.tar.gz
├── papex.json            # manifesto do editor, serializado (indentação de 2 espaços)
├── papex-template.tex    # documento principal com bibstyle/twocolumn injetados
├── papex.cls             # classe de documento (trazida de /writespace/papex.cls)
├── references.bib        # auto-gerado a partir das referências (omitido se nenhuma)
├── sections/
│   ├── intro.tex         # a seção que você escreveu em "Corpo"
│   └── …
└── _papex_*.tex          # fragmentos intermediários auto-gerados (não editar)
    ├── _papex_meta.tex       # título/autores/afiliações/palavras-chave/título corrente
    ├── _papex_abstract.tex   # resumo
    ├── _papex_sections.tex   # montagem \section + \input
    ├── _papex_backmatter.tex # agradecimentos/financiamento
    └── _papex_appendices.tex # \appendix + apêndices
```

- Os arquivos `_papex_*.tex` são produzidos por `genMeta` / `genAbstract` / `genSections` /
  `genBackmatter` / `genAppendices`; campos de texto puro passam por um único `latexEscape`,
  enquanto os corpos de seção são `\input` verbatim.
- Este arquivo pode ser enviado manualmente na página "upload de pacote de fontes", ou submetido
  automaticamente pelo botão **Publicar** — os dois são equivalentes.

---

## 8. Notas de implementação

| Preocupação | Implementação |
| --- | --- |
| Modelo de dados | `src/lib/writespace/manifest.ts`: tipos alinhados com `papex.schema.json` + `papex-json.ts`, frontend puro, sem importações de servidor |
| Geração LaTeX | `src/lib/writespace/latex-gen.ts`: porta a lógica de `papex-build.py` para TS; o escape usa uma **varredura de caracteres em passagem única** (consistente com o `papex-build.py` fixo, evitando re-escape de `\textbackslash{}`) |
| Empacotamento | `src/lib/writespace/targz.ts`: ustar feito à mão + `CompressionStream('gzip')`, zero-dependência, puro navegador |
| Assets de template | `public/writespace/papex.cls` + `papex-template.tex` (copiados de `papex-latex/`, normalizados para LF), buscados em tempo de execução para o arquivo |
| Orquestração | `src/components/writespace/writespace-client.tsx`: três `Tabs` + persistência de rascunho + export/publish |
| Internacionalização | bloco `writespace` de `src/i18n/dictionaries/{zh,en}.ts` (~70 chaves), correspondendo aos rótulos da UI |

---

## 9. Segurança e limites

- **Permissões**: tanto a entrada quanto a publicação exigem login; um artigo de destino de nova versão deve pertencer
  ao usuário atual (ou a um papel privilegiado), caso contrário o backend retorna `FORBIDDEN`.
- **Sem persistência no servidor**: toda a geração e o empacotamento acontecem na memória do navegador; os arquivos
  deixam a máquina apenas quando você clica em baixar/publicar. A plataforma ainda aplica o sandbox TeX,
  limites de tamanho e desativação de shell-escape do
  [Guia de submissão §6/§7](/en/guide/submission#6-deployment-and-ops).
- **Suporte de navegador**: `CompressionStream('gzip')` precisa de um navegador recente (Chrome/Edge 80+,
  Firefox 113+, Safari 16.4+); quando indisponível, a exportação falha com uma mensagem amigável.
- **Limite de 50MB**: publicar passa por `/api/submit/archive` e está sujeito ao mesmo teto de 50MB.

---

## 10. FAQ

**P: Autoria online vs. upload de pacote de fontes — qual usar?**
Qualquer uma. A autoria online convém a autores que não querem a linha de comando e desejam validação ao vivo;
o upload de pacote de fontes convém a quem tem um projeto TeX local e quer o controle fino do `papex-build.py`.
Ambos produzem resultados idênticos no banco de dados.

**P: O `tar.gz` exportado pode ser enviado manualmente na página "upload de pacote de fontes"?**
Sim, e é equivalente. O arquivo exportado já empacota `papex.cls` e
`papex-template.tex`, então o backend não precisa copiá-los de `PAPEX_LATEX_DIR`.

**P: Usei `\cite{key}` no corpo, mas a citação não foi vinculada após publicar?**
A vinculação de citação depende do `doi` / `arxivId` da referência corresponder a um artigo já na
plataforma; entradas com apenas `url` / `title` entram no grafo de citações mas não formam um
link interno. Verifique se o DOI / arXiv ID da referência está correto.

**P: Os rascunhos são sincronizados na nuvem?**
Não. Os rascunhos vivem apenas no `localStorage` do navegador; trocar de dispositivo ou limpar o cache os perde.
Crie o hábito de **Exportar** ou **Publicar**.

**P: As fórmulas `$...$` no corpo serão corrompidas?**
Não. O `.tex` de seção é escrito verbatim (sem escape); as fórmulas são renderizadas pela compilação XeLaTeX
do backend. Apenas os campos de texto puro em "Metadados" são escapados.

**P: Sem PDF imediatamente após publicar?**
Igual ao [FAQ do Guia de submissão](/en/guide/submission#8-faq): depende de o servidor
ter o TeX Live configurado; quando não, `pdfUrl` fica vazio e a página mostra "PDF está sendo compilado em segundo plano".
