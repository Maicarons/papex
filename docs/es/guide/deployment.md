# Despliegue

Papex se puede desplegar en Vercel, cualquier entorno Docker, o un servidor autoalojado.

## Vercel

1. Importe el repo en Vercel.
2. Defina variables de entorno: `DATABASE_URL`, `AUTH_SECRET`.
3. Comando de construcción: `npm run build` (la salida la gestiona Next.js).
4. Vincule Postgres vía Vercel Storage, o rellene un `DATABASE_URL` externo.
5. Ejecute las migraciones una vez tras el despliegue: `npm run db:migrate`.
6. **Almacenamiento de PDF**: el sistema de archivos de Vercel es de solo lectura en tiempo de ejecución, así que defina
   `STORAGE_DRIVER=s3` y las variables `PAPEX_S3_*` (ver
   [Configuración → Almacenamiento](./configuration.md)). La ruta de streaming entonces
   redirige a una URL de objeto firmada en lugar de servir bytes desde el disco.

## Docker / autoalojado

Use el `docker-compose.yml` raíz para ejecutar app + base de datos juntas:

```bash
docker compose up -d
```

O ejecute solo Postgres en Docker y construya la imagen Next.js usted mismo:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Sitio de documentación

La documentación se construye con VitePress en `public/docs` y la sirve la app principal en `/docs`:

```bash
npm run docs:build
```
