# Acerca de Papex

Papex es una plataforma **abierta e independiente** para gestionar y descubrir literatura académica. Nuestro objetivo es proporcionar a los investigadores infraestructura abierta, transparente y autoalojable.

## Nuestra misión

Papex reduce la barrera de la infraestructura de literatura académica: desde el envío y el versionado hasta la búsqueda de texto completo y las API abiertas, todo puede desplegarse y ampliarse libremente. Valoramos los estándares abiertos y la colaboración comunitaria por encima del bloqueo.

## Características clave

- **Envío y versionado**: artículos multi-versión con resúmenes, autores y PDF archivados permanentemente; el análisis por lotes de PDF extrae texto y referencias al subir; retirada con un motivo registrado.
- **Búsqueda de texto completo y avanzada**: búsqueda multilingüe (CJK/inglés) con `tsvector` + `pg_trgm`, sintaxis booleana avanzada (ámbito de campo `ti/abs/au/cat/id`, AND/OR/NOT, paréntesis), con filtros de categoría, autor y rango de fechas y ordenación por citas.
- **Categorías y etiquetas**: un árbol de categorías temáticas con listado cruzado, además de etiquetas creadas por el usuario, auto-etiquetado y una nube de etiquetas populares en la página de inicio.
- **Autores y afiliaciones**: perfiles de autor que listan artículos y afiliaciones institucionales.
- **Citas, analítica y exportación**: un grafo de citas (relaciones DOI / id de artículo) con una vista dirigida por fuerza, análisis de co-citación y co-autoría, recuentos de citas, y exportación GB/T 7714 · BibTeX · APA.
- **Bibliometría**: totales de citas por autor, índice H y una red de co-autores de ECharts.
- **Comentarios y discusión**: respuestas en hilos en cada artículo.
- **Suscripciones, alertas y RSS/correo**: siga categorías, autores y artículos; un feed consolidado con un distintivo de no leídos en vivo; entrega opcional por Resend/SMTP o RSS.
- **Marcadores y grupos**: guardado con un clic más grupos de marcadores con nombre para organizar una colección de lectura posterior.
- **Mensajes, tickets y comentarios**: mensajes internos integrados, una máquina de estados de tickets y comentarios para el soporte de la comunidad.
- **Co-revisión (revisión por pares)**: un bucle completo de asignar, responder, enviar opinión y acuse de recibo, con notificaciones unificadas.
- **Permisos, roles y respaldo**: acceso detallado basado en roles con control por rol o por usuario, una cola de moderación, y una puerta de respaldo para el primer envío.
- **Analítica de administración**: agregados de envío, categoría, autor y revisión con gráficos.
- **API abierta y claves de API**: una especificación OpenAPI 3.1 con documentación interactiva, además de claves de API programáticas que heredan el RBAC del propietario.
- **Perfiles, temas e i18n**: perfiles personales y páginas `/u/[username]`, temas claro/oscuro y una interfaz en chino/inglés.
- **Redacción en el navegador (Writespace)**: escritura LaTeX en el navegador, compilación y publicación con un clic.

## Código abierto

Papex se distribuye bajo la licencia [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) y es gratuita para uso comercial y no comercial. Las contribuciones son bienvenidas mediante tickets y comentarios.
