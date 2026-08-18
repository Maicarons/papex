# Redacción en línea (Writespace)

Esta guía cubre el módulo integrado de **redacción en línea** de Papex (punto de entrada
`/writespace`) — un escritorio de redacción basado en el navegador que no requiere instalación local de TeX ni
JSON escrito a mano. Lleva el flujo de ["subida de paquete fuente"](/en/guide/submission) de la
guía de envío directamente al navegador: rellena los metadatos y escribe el cuerpo en línea, y el sistema
genera un `papex.json` conforme más los archivos `.tex` de sección. Luego puede **exportar un `tar.gz`**
o **publicar en la plataforma con un clic**.

---

## 1. Resumen

### 1.1 Qué puntos débiles resuelve

| Punto débil del clásico "envío de paquete fuente" | Qué hace la redacción en línea |
| --- | --- |
| Escribir `papex.json` a mano es propenso a errores (campos faltantes, mal formato) | Editor visual + validación en tiempo real |
| Verificar la estructura requiere instalación local de Python / TeX | El `.tex` intermedio se genera en el navegador — sin cadena de herramientas local |
| Empaquetar y subir son dos pasos separados | "Exportar" y "Publicar" en un solo clic desde el editor |
| Perder trabajo a mitad del borrador | Autoguardado en `localStorage` del navegador |

### 1.2 Las tres pestañas

| Pestaña | Propósito |
| --- | --- |
| **Metadatos** | Información del artículo, autores, referencias, opciones de construcción — un editor visual de `papex.json` |
| **Cuerpo** | Banco de trabajo estructurado de sección / apéndice para escribir el texto del cuerpo LaTeX |
| **Exportar y publicar** | Validación en tiempo real, vista previa del archivo, exportar `tar.gz` / publicar con un clic |

### 1.3 Relación con el sistema de envío

La redacción en línea **no** es un nuevo método de envío — es el **front-end de redacción**
de "subida de paquete fuente". El archivo que produce es byte a byte compatible con la
[subida de paquete fuente](/en/guide/submission#3-method-2-source-package-upload), y la publicación
reutiliza el mismo endpoint de backend `POST /api/submit/archive`, siguiendo la misma
tubería "desempaquetar → validar → crear artículo → enlazar grafo de citas → construir PDF"
(ver [Guía de envío §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 2. Punto de entrada y permisos

- **Punto de entrada**: `/writespace`.
- **Auth a nivel de página**: el componente de servidor `src/app/writespace/page.tsx` llama a
  `getCurrentUser()` y a `redirect("/login")` cuando no está autenticado.
- **Middleware**: `src/middleware.ts` añade `/writespace` a `PROTECTED_PREFIXES` y añade
  `/writespace/:path*` al `matcher`, de modo que las peticiones no autenticadas se bloquean en el borde.
- **Permiso de publicación**: publicar es fundamentalmente un envío de paquete fuente y está sujeto
  a las mismas reglas `FORBIDDEN` / `PAPER_NOT_FOUND` en
  [Guía de envío §4](/en/guide/submission#4-end-to-end-processing-flow-backend) — cuando
  `paper.id` declara una nueva versión, debe tener permiso de envío sobre ese artículo.

---

## 3. Pestaña uno: Editor de metadatos

La pestaña **Metadatos** corresponde a `MetadataEditor`. Divide los bloques `paper` / `authors` /
`references` / `build` de `papex.json` en formularios tipo tarjeta, con campos
alineados uno a uno a [Guía de envío §3.2](/en/guide/submission#32-papexjson-field-reference).

### 3.1 Información del artículo (`metaPaper`)

Título, subtítulo, resumen, palabras clave (separadas por comas), categoría principal (desplegable, requerida),
categorías secundarias (añadir/quitar), DOI, licencia (desplegable, por defecto `CC-BY-4.0`), venue,
nota de versión, idioma, id de artículo (opcional — si se rellena y pertenece a uno de sus artículos
existentes, se envía como nueva versión).

### 3.2 Autores (`metaAuthors`)

- Añada varios autores; cada tarjeta admite reordenar arriba / abajo / quitar.
- Campos: nombre (requerido), afiliación, correo, ORCID (con comprobación de formato), página web, conmutador de
  autor correspondiente, conmutador de contribución igual, nota al pie, orden.
- Autor correspondiente / contribución igual / nota al pie se renderizan como notas al pie `\thanks` en el PDF;
  ORCID y la página web también aparecen en las notas al pie.

### 3.3 Referencias (`metaReferences`)

- Añada varias entradas BibTeX; los campos incluyen clave de cita (requerida, con comprobación de formato), tipo
  (desplegable, 12 tipos BibTeX), título, autor, revista, libro, año, DOI, URL, ID de arXiv,
  páginas, volumen, número, editorial, nota.
- Dos propósitos: ① al publicar, se enlazan al grafo de citas de la plataforma vía
  `mapReferencesToCitations`; ② al exportar, se usa para auto-generar `references.bib`
  (ver [§7](#7-exported-archive-structure)).

### 3.4 Opciones de construcción (`metaBuild`)

- Estilo de bibliografía: `numeric` / `authoryear` (se inyecta en el documento principal como
  `\documentclass[11pt,bibstyle=authoryear]`).
- Columnas: `1` / `2` (dos columnas inyecta `twocolumn`).
- Otras opciones de `build` (p. ej. `fontset`, `documentclass`) se reservan para la
  compilación en el servidor; valores por defecto ver `createDefaultDraft`.

### 3.5 Validación en tiempo real

Cada edición pasa por `validateDraft()` (`src/lib/writespace/manifest.ts`); el resultado se
comparte con la pestaña **Exportar y publicar**. Reglas centrales:

| Comprobación | Regla | Tipo |
| --- | --- | --- |
| `schemaVersion` | debe coincidir con `x.y.z` | error |
| `paper.title` / `abstract` / `primaryCategoryId` | requeridos y no vacíos | error |
| `paper.id` (opcional) | si está presente debe coincidir con `YYMM.NNNNN` | error |
| `authors` | al menos 1; cada `name` requerido; `orcid` debe coincidir con `0000-0000-0000-0000` | error |
| `sections` | al menos 1; cada `file` requerido; `id` solo letras, dígitos, `-`, `_` | error |
| `references` | cada `key` requerida, limitada a `A-Za-z0-9_:+.-`; `year` ∈ [0, 3000] | error |
| cuerpo de sección vacío | aviso | advertencia |

> Los "errores" bloquean la publicación; las "advertencias" (p. ej. un cuerpo de sección vacío) son solo avisos.

---

## 4. Pestaña dos: Banco de trabajo de cuerpo

La pestaña **Cuerpo** corresponde a `SectionsEditor` y gestiona el cuerpo y los apéndices del artículo
estructuralmente.

### 4.1 Lista de secciones

- Cada sección (o apéndice) es una tarjeta plegable con: id/nombre de archivo (`file`, p. ej.
  `sections/intro.tex`), título de sección, nivel (`section` / `subsection` / `subsubsection` /
  `chapter` / `part`), cuerpo (área de texto LaTeX), conteo de caracteres.
- Admite: añadir sección, añadir apéndice, mover arriba / abajo, quitar.
- El nivel determina el comando emitido al exportar (`\section{Título}` → `\input{sections/intro.tex}`).

### 4.2 Reglas del contenido del cuerpo

- El `.tex` de sección se escribe a mano y admite **LaTeX completo**: matemáticas, figuras, comandos
  personalizados, y referencias `\cite{key}` (coincidiendo con las claves de referencia).
- El cuerpo de sección **no se escapa** (coherente con
  [Guía de envío §3.3](/en/guide/submission#33-xelatex-toolchain-papex-latex)); solo los
  campos de texto plano de "Metadatos" se escapan.
- Un botón "Insertar secciones de ejemplo" escribe cinco secciones de demostración (intro / trabajo relacionado /
  método / experimentos / conclusión) con fórmulas LaTeX, para un inicio rápido.

### 4.3 Apéndices

Las entradas de apéndice comparten la estructura de sección y se emiten tras un único `\appendix`.

---

## 5. Pestaña tres: Exportar y publicar

La pestaña **Exportar y publicar** corresponde a `ExportPanel` — la salida de todo el flujo.

### 5.1 Estado de validación

Muestra el resultado de `validateDraft()` en vivo en la parte superior: "válido" o "inválido" más una lista de
errores/advertencias. El botón **Publicar** está deshabilitado mientras existan errores.

### 5.2 Vista previa del manifiesto de archivos

Muestra los archivos del archivo que se producirán (es decir, la salida de `buildArchiveFiles`,
[§7](#7-exported-archive-structure)), para que pueda confirmar la estructura antes de descargar/publicar.

### 5.3 Exportar `tar.gz`

Haga clic en **Exportar**: se genera un `tar.gz` totalmente en el navegador y dispara una descarga
(nombre de archivo desde i18n `writespace.expDownloadName`).

- Totalmente **sin dependencias**: `src/lib/writespace/targz.ts` elabora a mano el empaquetado POSIX ustar más
  el nativo `CompressionStream('gzip')` — sin backend involucrado.
- Los activos de plantilla (`papex-template.tex` / `papex.cls`) se obtienen al exportar desde
  `/writespace/papex-template.tex` y `/writespace/papex.cls` y se empaquetan en el archivo,
  manteniéndolo **autónomo** (el backend compila directamente vía `latexmk`).

### 5.4 Publicar con un clic

Haga clic en **Publicar**: ejecuta los mismos pasos de generación que la exportación, luego `POST`ea el `tar.gz` como
el campo `file` de una petición `multipart/form-data` a `/api/submit/archive`.

- Publicar requiere `validation.valid === true` por adelantado.
- En caso de éxito muestra el "id de artículo + versión" devuelto y `warnings`, con un enlace "ver artículo",
  y limpia la bandera de borrador local.
- En caso de fallo muestra el mensaje de error del backend en línea (mapeo en la
  [tabla de errores de la Guía de envío §4](/en/guide/submission#4-end-to-end-processing-flow-backend)).

---

## 6. Autoguardado y restauración de borrador

- El borrador (`manifest` + cuerpo por sección) se autoguarda en `localStorage` del navegador
  (clave: `papex-writespace-draft`), con 400ms de debounce — sobrevive al cierre de página.
- Reabrir `/writespace` restaura el último borrador automáticamente y muestra "borrador local restaurado";
  tras editar muestra "autoguardado".
- El botón superior **Nuevo** pide confirmación, limpia `localStorage`, y reinicia a un
  borrador en blanco (con una sección intro de ejemplo).

> Los borradores viven solo en el navegador local; cambiar de dispositivo o limpiar los datos del navegador los pierde.
> Para trabajo importante, recuerde **Exportar** o **Publicar**.

---

## 7. Estructura del archivo exportado

El `tar.gz` producido por **Exportar / Publicar** lo ensambla `buildArchiveFiles()` y es
totalmente compatible con lo que espera el backend `papex-archive.ts`:

```
my-paper.tar.gz
├── papex.json            # manifiesto del editor, serializado (sangría de 2 espacios)
├── papex-template.tex    # doc principal con bibstyle/twocolumn inyectados
├── papex.cls             # clase de documento (incluida desde /writespace/papex.cls)
├── references.bib        # generada automáticamente a partir de referencias (omitida si no hay)
├── sections/
│   ├── intro.tex         # la sección que escribió en "Cuerpo"
│   └── …
└── _papex_*.tex          # fragmentos intermedios auto-generados (no editar)
    ├── _papex_meta.tex       # título/autores/afiliaciones/palabras clave/título corriente
    ├── _papex_abstract.tex   # resumen
    ├── _papex_sections.tex   # ensamblaje \section + \input
    ├── _papex_backmatter.tex # agradecimientos/financiación
    └── _papex_appendices.tex # \appendix + apéndices
```

- Los archivos `_papex_*.tex` los producen `genMeta` / `genAbstract` / `genSections` /
  `genBackmatter` / `genAppendices`; los campos de texto plano pasan por un único `latexEscape`,
  mientras que los cuerpos de sección se `\input` verbatim.
- Este archivo se puede subir manualmente en la página "subida de paquete fuente", o enviarlo
  automáticamente con el botón **Publicar** — ambos son equivalentes.

---

## 8. Notas de implementación

| Aspecto | Implementación |
| --- | --- |
| Modelo de datos | `src/lib/writespace/manifest.ts`: tipos alineados con `papex.schema.json` + `papex-json.ts`, frontend puro, sin imports de servidor |
| Generación LaTeX | `src/lib/writespace/latex-gen.ts`: porta la lógica de `papex-build.py` a TS; el escape usa un **escaneo de caracteres de una sola pasada** (coherente con el `papex-build.py` fijo, evitando re-escapar `\textbackslash{}`) |
| Empaquetado | `src/lib/writespace/targz.ts`: ustar hecho a mano + `CompressionStream('gzip')`, sin dependencias, puro navegador |
| Activos de plantilla | `public/writespace/papex.cls` + `papex-template.tex` (copiados de `papex-latex/`, normalizados a LF), obtenidos en tiempo de ejecución al archivo |
| Orquestación | `src/components/writespace/writespace-client.tsx`: tres `Tabs` + persistencia de borrador + exportar/publicar |
| Internacionalización | `src/i18n/dictionaries/{zh,en}.ts` bloque `writespace` (~70 claves), coincidiendo con las etiquetas de UI |

---

## 9. Seguridad y límites

- **Permisos**: tanto la entrada como la publicación requieren inicio de sesión; el artículo de destino de nueva versión debe pertenecer
  al usuario actual (o a un rol privilegiado), de lo contrario el backend devuelve `FORBIDDEN`.
- **Sin persistencia en el servidor**: toda la generación y el empaquetado ocurren en memoria del navegador; los archivos salen
  de la máquina solo cuando hace clic en descargar/publicar. La plataforma aún aplica el sandbox TeX,
  los límites de tamaño, y la desactivación de shell-escape de
  [Guía de envío §6/§7](/en/guide/submission#6-deployment-and-ops).
- **Soporte de navegador**: `CompressionStream('gzip')` necesita un navegador reciente (Chrome/Edge 80+,
  Firefox 113+, Safari 16.4+); cuando no está disponible, la exportación falla con un mensaje amigable.
- **Límite de 50MB**: publicar pasa por `/api/submit/archive` y está sujeto al mismo límite de 50MB.

---

## 10. Preguntas frecuentes

**P: Redacción en línea vs. subida de paquete fuente — ¿cuál usar?**
Cualquiera. La redacción en línea conviene a autores que no quieren la línea de comandos y desean validación en vivo;
la subida de paquete fuente conviene a quienes tienen un proyecto TeX local y quieren el control fino de `papex-build.py`.
Ambos producen resultados idénticos en la base de datos.

**P: ¿Se puede subir manualmente el `tar.gz` exportado en la página "subida de paquete fuente"?**
Sí, y es equivalente. El archivo exportado ya incluye `papex.cls` y
`papex-template.tex`, así que el backend no necesita copiarlos de `PAPEX_LATEX_DIR`.

**P: Usé `\cite{key}` en el cuerpo pero la cita no se enlazó tras publicar?**
El enlace de citas depende de que el `doi` / `arxivId` de la referencia coincida con un artículo ya en la
plataforma; las entradas con solo `url` / `title` van al grafo de citas pero no forman un
enlace interno. Compruebe que el DOI / ID de arXiv de la referencia sea exacto.

**P: ¿Se sincronizan los borradores a la nube?**
No. Los borradores viven solo en `localStorage` del navegador; cambiar de dispositivo o limpiar la caché los pierde.
Haga el hábito de **Exportar** o **Publicar**.

**P: ¿Se manglearán las fórmulas `$...$` del cuerpo?**
No. El `.tex` de sección se escribe verbatim (sin escape); las fórmulas las renderiza la compilación XeLaTeX del backend.
Solo los campos de texto plano de "Metadatos" se escapan.

**P: ¿Sin PDF inmediatamente tras publicar?**
Igual que las [Preguntas frecuentes de la Guía de envío](/en/guide/submission#8-faq): depende de si el servidor
tiene TeX Live configurado; cuando no, `pdfUrl` está vacío y la página muestra "El PDF se está construyendo en segundo plano".
