# Guía de envío

Esta guía explica los dos métodos de envío de artículos compatibles con Papex, y
proporciona una referencia completa para el **envío de paquetes fuente** junto con su
manifiesto `papex.json` y la cadena de herramientas XeLaTeX.

---

## 1. Resumen

Papex ofrece dos puntos de entrada de envío para diferentes flujos de trabajo:

| Método | Punto de entrada | Audiencia | Características |
| --- | --- | --- | --- |
| **Envío por formulario** | Página web "Enviar → Formulario" / `POST /api/papers` | Enviadores ocasionales | Rellene título, resumen, autores, etc. en el navegador; **suba el PDF de texto completo directamente** (≤50MB) |
| **Subida de paquete fuente** | Página web "Enviar → Paquete fuente" / `POST /api/submit/archive` | Autores LaTeX | Empaquete sus fuentes con un manifiesto `papex.json` en un `tar.gz`; la plataforma **crea el artículo, enlaza citas y construye el PDF** automáticamente |

> Ambos métodos comparten la misma lógica de ingesta (`createSubmission` + `addCitation`).
> Difieren solo en el origen de los metadatos y en cómo se producen el cuerpo/el PDF.

> **¿Prefiere no tocar la línea de comandos?** También puede usar el módulo integrado de
> [Redacción en línea](/en/guide/writespace) para editar `papex.json` visualmente, escribir el cuerpo,
> y "exportar `tar.gz`" o "publicar con un clic" directamente en el navegador — el archivo que produce
> es totalmente equivalente a una subida de paquete fuente.

---

## 2. Método 1: Envío por formulario

Haga clic en **Enviar** en la navegación superior, elija la pestaña **Formulario**, rellene los campos
y haga clic en "Enviar artículo":

- **Título**, **Resumen**
- **Categoría principal** (requerida, código del árbol de categorías p. ej. `cs.LG`),
  **Categorías cruzadas** (separadas por comas, opcional)
- **Autores** (añada tantos como necesite; el orden es el orden de autoría)
- **Subir PDF** (opcional): arrastre y suelte o elija un PDF (≤50MB); la plataforma lo almacena
  y enlaza las referencias automáticamente. **DOI** (opcional), **Licencia** (por defecto `CC-BY-4.0`),
  **Nota de versión** (opcional)

El artículo entra entonces en la cola de revisión. El envío por formulario se envía como `multipart/form-data`:
`meta` es una cadena JSON de los metadatos, `pdf` es el archivo PDF opcional.

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

> El PDF es opcional. Cuando se proporciona, el endpoint lo almacena contra la versión del artículo,
> analiza el cuerpo, enlaza citas dentro de la plataforma, y devuelve
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`. El formulario web lo envía
> automáticamente; los clientes de API aún pueden enviar JSON simple (sin `pdf`).

---

## 3. Método 2: Subida de paquete fuente

La subida de paquete fuente es un **flujo de trabajo de autor**: usted escribe el artículo en LaTeX, describe
los metadatos y las referencias en un `papex.json` estructurado, empaqueta todo en un
`tar.gz` y lo sube en un solo paso. El backend gestiona "desempaquetar → validar → ingerir →
enlazar citas → construir PDF" de extremo a extremo.

### 3.1 Estructura del paquete

Una disposición de paquete mínima pero recomendada:

```
my-paper.tar.gz
├── papex.json            # requerido: manifiesto del artículo (metadatos + secciones + referencias)
├── papex-template.tex    # documento principal (use el papex-template.tex proporcionado en el repo)
├── papex.cls             # clase de documento (opcional; el servidor la copia de PAPEX_LATEX_DIR si falta)
├── references.bib        # opcional: BibTeX escrito a mano; de lo contrario se genera automáticamente a partir de las referencias
└── sections/             # secciones del cuerpo (fragmentos .tex, referenciados en orden por papex.json)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> El paquete **debe contener `papex.json`**; de lo contrario el envío se rechaza (HTTP 400).

### 3.2 Referencia de campos de `papex.json`

El esquema JSON completo está en [`papex-latex/papex.schema.json`](https://github.com/).
Campos centrales y sus destinos:

| Campo | Tipo | Requerido | Notas / Destino en BD |
| --- | --- | --- | --- |
| `paper.id` | string (`YYMM.NNNNN`) | no | Si coincide con **su propio (o del admin) artículo existente** → se envía como una nueva versión; de lo contrario se asigna un nuevo id de artículo |
| `paper.title` | string | sí | → `papers.title` / `paper_versions.title` |
| `paper.abstract` | string | sí | → `paper_versions.abstract` |
| `paper.keywords` | string[] | no | Se renderiza tras el resumen en el PDF (no se almacena por separado) |
| `paper.primaryCategoryId` | string | sí | → `papers.primaryCategoryId`; **debe existir** en la tabla de categorías o 400 |
| `paper.secondaryCategoryIds` | string[] | no | → `paper_categories` (no principal) |
| `paper.doi` | string | no | → `paper_versions.doi`, también se escribe en el grafo de citas (`target_doi`) |
| `paper.license` | string | no | → `paper_versions.license`, por defecto `CC-BY-4.0` |
| `paper.versionNote` | string | no | → `paper_versions.comments` |
| `paper.subtitle` | string | no | Se renderiza bajo el título en el PDF |
| `paper.venue` | string | no | Se renderiza en el bloque del título (p. ej. conferencia/revista) |
| `authors[].name` | string | sí | → `authors` + `paper_authors` (ordenado por `order`) |
| `authors[].orcid` | string | no | Nota al pie del autor |
| `authors[].email` | string | no | Usado como contacto de autor correspondiente |
| `authors[].affiliation` | string | no | **Cadena** → resuelta a `affiliations.id` vía `findOrCreateAffiliation` |
| `authors[].corresponding` | boolean | no | Nota al pie "Autor correspondiente" |
| `authors[].equalContribution` | boolean | no | Nota al pie "Contribución igual" |
| `authors[].footnote` | string | no | Nota al pie de texto libre |
| `references[].key` | string | sí | Clave de cita BibTeX |
| `references[].doi` / `arxivId` | string | no | Resuelta a un artículo dentro de la plataforma vía `resolveTarget`; si no, `url`/`title` van a `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | string | no | Rellenan `citations` y el `references.bib` generado automáticamente |
| `sections[]` | string[] | sí | Lista ordenada de rutas `.tex` de sección; **solo dirige LaTeX, no se almacena en tablas** |
| `appendices[]` | string[] | no | Lista ordenada de rutas `.tex` de apéndice |
| `acknowledgments` / `funding` | string | no | Se renderiza en la sección de agradecimientos/financiación del PDF |
| `build` | object | no | Opciones de construcción: `style` (numérico/autoraño), `fontset` (fandol/windows/mac/ubuntu), `passthrough` (campos exentos de escape), etc. |

> **Diferencia con el envío por formulario**: `papex.json` usa una **cadena** `affiliation`
> en lugar de un `affiliationId` numérico; la capa de mapeo busca o crea la
> fila de `affiliations`. También añade campos solo-LaTeX `sections`, `references`,
> `appendices`, `build`.

### 3.3 Cadena de herramientas XeLaTeX (`papex-latex/`)

Una cadena de herramientas XeLaTeX dedicada se incluye en [`papex-latex/`](https://github.com/):

```
papex-latex/
├── papex.cls              # clase de documento (ctex + authblk + biblatex, CJK+inglés, macros de metadatos, encabezados/pies)
├── papex-template.tex     # documento principal, hace \input automático de los _papex_*.tex y secciones generados
├── papex-build.py         # constructor sin dependencias (solo stdlib; jsonschema opcional)
├── papex.schema.json      # contrato de manifiesto draft-07
├── latexmkrc              # configuración opcional de latexmk
├── README.md              # uso de la cadena de herramientas
└── example/               # paquete de ejemplo completo (artículo chino + 5 secciones + apéndice)
```

**Destacados de `papex.cls`**

- **CJK + inglés**: basado en `ctex` (`scheme=plain`), `fontset=fandol` por defecto (incluido
  con TeX Live, compila en el servidor sin configuración); cambie localmente con
  `windows` / `mac` / `ubuntu`.
- **Autores/afiliaciones**: `authblk` con afiliaciones compartidas, nota al pie de autor correspondiente y
  de contribución igual.
- **Referencias**: `biblatex` + `biber`, `numeric` / `authoryear` seleccionable.
- **Macros de metadatos**: `\papexPaperId` (id de artículo sobre el título), `\papexSubtitle`,
  `\papexVenue`, `\papexDoi` (enlace automático a doi.org), `\papexVersionNote`, `\papexKeywords`
  (tras el resumen), `\papexLicense` (pie), `\papexRunningTitle` (encabezado).
- **Independiente de marca**: sin texto de *preprints / arXiv*, coherente con la
  convención de producto "libre de arXiv".

**Flujo de `papex-build.py`**

1. Lee `papex.json` (la entrada puede ser un directorio / un json único / un `.tar.gz`).
2. Valida (prefiere `jsonschema`, de lo contrario comprobaciones integradas).
3. Escapa los campos de texto plano (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …), generando `_papex_meta.tex`, `_papex_abstract.tex`,
   `_papex_sections.tex`, `_papex_backmatter.tex`, `_papex_appendices.tex` y
   `references.bib` (se omite si el archivo ya incluye `references.bib`).
4. Compila con `latexmk -xelatex` (`--emit-only` emite solo intermedios,
   `--validate` solo valida).
5. Los archivos `.tex` de sección los escribe el autor a mano y admiten LaTeX completo
   (incluida matemática); **no se escapan**. Use `build.passthrough` para eximir
   campos de texto JSON del escape.

### 3.4 Vista previa y construcción local

```bash
# entrar al paquete de ejemplo
cd papex-latex/example

# emitir solo .tex/.bib intermedios (no requiere TeX — útil para inspeccionar escape/estructura)
python3 ../papex-build.py . --emit-only

# validar solo papex.json
python3 ../papex-build.py . --validate

# generar y compilar el PDF (requiere un TeX Live local)
python3 ../papex-build.py .
```

Empaquete y envíe:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 Subir en el sitio web

1. Tras iniciar sesión, haga clic en **Enviar** en la navegación superior y elija la
   pestaña **Paquete fuente**.
2. Arrastre el `tar.gz` a la zona de destino, o haga clic para elegir un archivo (solo `.tar.gz` /
   `.tgz`, ≤ 50MB).
3. Haga clic en "Subir y enviar"; la plataforma devuelve el id y la versión del artículo, con
   notas de procesamiento (p. ej. PDF construyéndose en segundo plano).
4. Haga clic en "Ver artículo" para saltar a la página del artículo recién creado.

---

## 4. Procesamiento de extremo a extremo (backend)

Tras la subida, el backend procesa el paquete de la siguiente forma (código fuente en
`src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     gunzip sin dependencias + parser ustar/GNU/PAX, guarda contra path traversal
                         │
                         ▼
                  ② leer papex.json → coerceManifest() valida campos requeridos
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId debe existir (si no, 400)
                     · cadena affiliation → affiliations.id (findOrCreateAffiliation)
                     · paper.id coincide con artículo propio/privilegiado → nueva versión
                         │
                         ▼
                  ④ createSubmission() ingiere (reutiliza la transacción existente)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() → addCitation() enlaza el grafo de citas
                         │
                         ▼
                  ⑥ build XeLaTeX opcional (latexmk del servidor)
                     → savePdfBuffer() almacena → actualiza paper_versions.pdfUrl
                     (latexmk ausente → solo aviso, la ingesta no se ve afectada)
                         │
                         ▼
                 devuelve { paperId, version, warnings, pdfUrl? }
```

**Módulos clave**

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/latex/tar.ts` | `gunzip` + `parseTar` sin dependencias (ustar / nombres largos GNU / cabeceras extendidas PAX), `writeEntries` con guarda contra path traversal |
| `src/lib/latex/papex-json.ts` | Tipos `PapexManifest`, `coerceManifest`, `mapToCreatePaperInput`, `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | Orquestación de `processSubmissionArchive`; `buildAndStorePdf` sondea `latexmk` y compila/almacena el PDF |
| `src/app/api/submit/archive/route.ts` | Acepta `multipart/form-data` `file` (≤50MB), autentica, mapea errores a estado HTTP |

**Mapeo de códigos de error (HTTP)**

| Error interno | HTTP | Significado |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | El archivo no tiene `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` no es JSON válido |
| `MANIFEST_INVALID:…` | 400 | Falta campo requerido (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | El código de categoría no existe |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | Archivo corrupto o vacío |
| `FORBIDDEN` | 403 | No se permite enviar una nueva versión de ese artículo |
| `PAPER_NOT_FOUND` | 404 | El artículo de destino declarado para la nueva versión no existe |
| otro | 500 | Error interno (incl. `ID_GENERATION_FAILED`) |

---

## 5. Referencia de API

### `POST /api/papers`

Endpoint de envío por formulario. La petición es `multipart/form-data` (ver
[Sección 2](#2-method-1-form-submission)): el campo `meta` es una cadena JSON de los metadatos,
el campo `pdf` es el archivo PDF opcional (≤50MB). Requiere autenticación. Devuelve `{ paperId, version }`,
y cuando se subió un PDF, un extra `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
Los clientes de API también pueden enviar JSON simple (sin `pdf`).

### `POST /api/submit/archive`

Endpoint de paquete fuente.

- **Auth**: requerida (cookie).
- **Petición**: `multipart/form-data`, el campo `file` es el `tar.gz` (≤ 50MB).
- **Éxito (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **Fallo**: JSON con el mensaje de error correspondiente; códigos de estado según la
  [tabla de errores](#4-end-to-end-processing-backend).

---

## 6. Despliegue y operaciones

- **TeX Live**: el servidor necesita `texlive` (con `xelatex`, `biber`, `latexmk`) y
  `collection-langchinese` para que las fuentes `fandol` estén disponibles.
- **Variables de entorno**:
  - `PAPEX_LATEX_BIN`: ruta a latexmk (por defecto `PATH`).
  - `PAPEX_LATEX_DIR`: directorio que contiene `papex.cls`; se copia cuando el archivo lo omite.
- **Sandbox y recursos**: ejecute la compilación LaTeX en un entorno aislado con
  límites de CPU/memoria/timeout, y **desactive `\write18` (shell-escape)** y el acceso de
  red para evitar que fuentes maliciosas ejecuten comandos.
- **Asíncrono**: la compilación es lenta; en producción prefiera una **cola asíncrona** (devuelve
  `paperId` inmediatamente, callback para actualizar `pdfUrl` cuando el PDF esté listo) para evitar
  bloquear la petición.
- **Degradación por ausencia**: si `latexmk` no está disponible, `processSubmissionArchive`
  registra `warnings` y omite la construcción del PDF; la ingesta y el enlace de citas siguen funcionando.
- **Almacenamiento de PDF**: reutiliza `savePdfBuffer` (ruta de streaming
  `/api/papers/{id}/pdf/{version}`); no se necesita una nueva capa de almacenamiento.

---

## 7. Seguridad

- **Path traversal**: `writeEntries` valida la ruta real de cada entrada con
  `path.relative`, rechazando `..` y rutas absolutas; `parseTar` elimina el `./` inicial.
- **Límite de tamaño**: la ruta limita `file` a ≤ 50MB.
- **Abuso de recursos**: la compilación tiene límites de timeout/recursos; considere un
  límite de tasa por usuario.
- **shell-escape**: el comando de compilación no pasa `-shell-escape`, evitando
  que las fuentes ejecuten comandos del sistema.

---

## 8. Preguntas frecuentes

**P: ¿El paquete fuente duplica datos del envío por formulario?**
No. Ambos comparten la misma lógica de ingesta; solo difiere el origen de los metadatos.

**P: ¿Debo usar la plantilla XeLaTeX?**
`papex.cls` y `papex-template.tex` determinan el diseño final del PDF; usted solo escribe los
archivos `.tex` de sección y `papex.json`. Si el archivo omite `papex.cls`, el servidor usa
la de `PAPEX_LATEX_DIR`.

**P: ¿Puedo usar matemáticas, figuras, comandos personalizados en las secciones?**
Sí. Los archivos `.tex` de sección se escriben a mano y admiten LaTeX completo, **sin escape**. Ponga
los comandos personalizados del preámbulo en los archivos de sección o en `papex-template.tex`.

**P: No veo un PDF justo después del envío.**
Si TeX Live no está configurado en el servidor, `pdfUrl` está vacío y la página indica "El PDF se está
construyendo en segundo plano". Configúrelo y reenvíe; en producción, pairlo con una cola asíncrona.

**P: ¿Cómo envío una nueva versión de un artículo?**
Defina `paper.id` en `papex.json` con el id de su artículo existente (y debe tener permiso de envío
sobre él); la plataforma lo ingiere como una nueva versión.

**P: ¿Cómo se enlazan las citas automáticamente?**
`doi` / `arxivId` en el array `references` se resuelven a artículos dentro de la plataforma vía
`resolveTarget` y se crea una arista de cita; las demás entradas se almacenan como
`url` / `title` en el grafo de citas.
