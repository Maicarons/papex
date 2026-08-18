# Configuración

Papex se configura mediante variables de entorno.

## Base de datos

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Autenticación

```bash
# Secreto usado para firmar los JWT. DEBE ser una cadena larga y aleatoria en producción (>= 16 caracteres).
AUTH_SECRET=change-me-to-a-long-random-string
# TTL de sesión en segundos (por defecto 7 días)
AUTH_SESSION_TTL=604800
```

### Claves de API

Las claves de API permiten que scripts e integraciones llamen a la API sin una sesión de navegador.
Se crean desde **Ajustes → Claves de API** (`/settings/api-keys`); el secreto crudo
solo se muestra una vez. Una clave se hashea con SHA-256 y se vincula a su
cuenta, por lo que hereda los permisos RBAC de su rol — no se requiere
configuración adicional. Envíela así:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Los endpoints públicos (artículos, búsqueda, categorías, autores, health) también aceptan
peticiones anónimas.

## Correo (opcional)

Los sistemas de mensajes y tickets no requieren correo. Para enviar correos de notificación, configure SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Almacenamiento (backend de PDF)

Los PDF subidos se almacenan mediante un backend conectable, seleccionado con `STORAGE_DRIVER`.

### `local` (por defecto)

El servidor gestiona los archivos PDF en su propio sistema de archivos bajo `PAPEX_STORAGE_DIR`
(por defecto `./storage`). Los bytes los devuelve por streaming la ruta
`/api/papers/{id}/pdf/{version}`. Use esto para Docker / autoalojado / dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (almacenamiento de objetos compatible con S3)

Las subidas van a un bucket compatible con S3 (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). La ruta de streaming entonces devuelve una redirección `302` a una URL de objeto **firmada** (o
pública), de modo que el PDF lo sirve el almacén de objetos y nunca pasa por el
servidor — requerido en plataformas de solo lectura/serverless como Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 para AWS; "auto" para Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # requerido para R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true para MinIO/R2/Spaces; false para AWS de host virtual
# Opcional: si el bucket/CDN es público, defina esta URL base para omitir la firma:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

Independientemente del backend, el `pdfUrl` almacenado en cada versión de artículo siempre apunta a
la ruta de streaming, así la UI y la API permanecen agnósticas al backend.
