# Configuração

O Papex é configurado por meio de variáveis de ambiente.

## Banco de dados

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## Autenticação

```bash
# Segredo usado para assinar JWTs. DEVE ser uma string longa e aleatória em produção (>= 16 caracteres).
AUTH_SECRET=change-me-to-a-long-random-string
# TTL da sessão em segundos (padrão 7 dias)
AUTH_SESSION_TTL=604800
```

### Chaves de API

Chaves de API permitem que scripts e integrações chamem a API sem uma sessão de navegador.
Elas são criadas em **Configurações → Chaves de API** (`/settings/api-keys`); o segredo
cru é mostrado apenas uma vez. Uma chave é hasheada com SHA-256 e vinculada à sua
conta, então ela herda as permissões RBAC do seu papel — nenhuma configuração extra
é necessária. Envie-a como:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Endpoints públicos (artigos, busca, categorias, autores, health) também aceitam
requisições anônimas.

## E-mail (opcional)

Os sistemas de mensagens e tickets não exigem e-mail. Para enviar e-mails de notificação, configure SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Armazenamento (backend de PDF)

Os PDFs enviados são armazenados por um backend pluggable, selecionado com `STORAGE_DRIVER`.

### `local` (padrão)

O servidor gerencia os arquivos PDF em seu próprio sistema de arquivos sob `PAPEX_STORAGE_DIR`
(padrão `./storage`). Os bytes são transmitidos de volta pela rota
`/api/papers/{id}/pdf/{version}`. Use isto para Docker / auto-hospedagem / dev.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (armazenamento de objetos compatível com S3)

Os uploads vão para um bucket compatível com S3 (AWS S3, MinIO, Cloudflare R2, DigitalOcean
Spaces). A rota de streaming então retorna um redirecionamento `302` para uma URL de objeto **assinada** (ou
pública), então o PDF é servido pelo armazenamento de objetos e nunca passa
pelo servidor — necessário em plataformas somente leitura/serverless como a Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 para AWS; "auto" para Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # obrigatório para R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true para MinIO/R2/Spaces; false para virtual-hosted da AWS
# Opcional: se o bucket/CDN for público, defina esta URL base para pular a assinatura:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

Independentemente do backend, o `pdfUrl` armazenado em cada versão do artigo sempre aponta para
a rota de streaming, então a UI e a API permanecem agnósticas ao backend.
