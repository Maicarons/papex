# Déploiement

Papex peut être déployé sur Vercel, tout environnement Docker, ou un serveur auto-hébergé.

## Vercel

1. Importez le dépôt dans Vercel.
2. Définissez les variables d'environnement : `DATABASE_URL`, `AUTH_SECRET`.
3. Commande de build : `npm run build` (sortie gérée par Next.js).
4. Liez Postgres via Vercel Storage, ou renseignez un `DATABASE_URL` externe.
5. Exécutez les migrations une fois après le déploiement : `npm run db:migrate`.
6. **Stockage PDF** : le système de fichiers de Vercel est en lecture seule à l'exécution, donc définissez
   `STORAGE_DRIVER=s3` et les variables `PAPEX_S3_*` (voir
   [Configuration → Stockage](./configuration.md)). La route de streaming redirige alors vers une URL
   d'objet pré-signée au lieu de servir les octets depuis le disque.

## Docker / auto-hébergé

Utilisez le `docker-compose.yml` racine pour exécuter l'app + la base de données ensemble :

```bash
docker compose up -d
```

Ou exécutez uniquement Postgres dans Docker et construisez vous-même l'image Next.js :

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## Site de docs

Les docs sont construites avec VitePress dans `public/docs` et servies par l'app principale à `/docs` :

```bash
npm run docs:build
```
