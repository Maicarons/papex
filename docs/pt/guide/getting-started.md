# Primeiros passos

Este guia ajuda você a executar o Papex localmente.

## Requisitos

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (Docker recomendado)
- npm ou pnpm

## 1. Instalar dependências

```bash
npm install
```

## 2. Preparar o banco de dados

Inicie o Postgres com o `docker-compose.yml` incluso:

```bash
docker compose up -d db
```

Copie e preencha o arquivo de ambiente:

```bash
cp .env.example .env
# Defina ao menos DATABASE_URL e AUTH_SECRET
```

## 3. Executar migrações e seed

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` grava a taxonomia completa de categorias, artigos de exemplo e uma conta de administrador.

## 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000.

## Contas padrão

| Papel | Usuário | Senha |
| --- | --- | --- |
| Admin | `admin` | `admin123456` |
| Autor (exemplo) | `demo` | `password123` |

> Altere as senhas padrão em produção e use um `AUTH_SECRET` longo e aleatório.
