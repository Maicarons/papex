# Implantação

O Papex pode ser implantado na Vercel, em qualquer ambiente Docker ou em um servidor auto-hospedado.

## Vercel

1. Importe o repositório para a Vercel.
2. Defina variáveis de ambiente: `DATABASE_URL`, `AUTH_SECRET`.
3. Comando de build: `npm run build` (saída tratada pelo Next.js).
4. Vincule o Postgres via Vercel Storage, ou preencha um `DATABASE_URL` externo.
5. Rode as migrações uma vez após a implantação: `npm run db:migrate`.
6. **Armazenamento de PDF**: o sistema de arquivos da Vercel é somente leitura em tempo de execução, então defina
   `STORAGE_DRIVER=s3` e as variáveis `PAPEX_S3_*` (veja
   [Configuração → Armazenamento](./configuration.md)). A rota de streaming então
   redireciona para uma URL de objeto assinada em vez de servir bytes do disco.

## Docker / auto-hospedado

Use o `docker-compose.yml` raiz para rodar app + banco de dados juntos:

```bash
docker compose up -d
```

Ou rode apenas o Postgres no Docker e construa a imagem Next.js você mesmo:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Site de documentação

A documentação é construída com VitePress em `public/docs` e servida pelo app principal em `/docs`:

```bash
npm run docs:build
```
