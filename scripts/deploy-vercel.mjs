/**
 * Deploy Papex to Vercel (public demo).
 *
 * Prerequisites (see NEXT-DIRECTIONS "公开演示实例清单"):
 *   VERCEL_TOKEN          — from https://vercel.com/account/tokens
 *   VERCEL_PROJECT_ID     — optional; otherwise a new project is created
 *   VERCEL_ORG_ID         — optional; required with PROJECT_ID for `vercel pull`
 *   DATABASE_URL          — Neon/Supabase pooled (pgvector)
 *   DATABASE_URL_UNPOOLED — direct connection string (for drizzle migrate)
 *   AUTH_SECRET           — 32+ chars
 *   STORAGE_DRIVER=s3     — Vercel FS is read-only; set PAPEX_S3_* too
 *
 * Usage:
 *   node scripts/deploy-vercel.mjs          # preview deploy
 *   node scripts/deploy-vercel.mjs --prod   # production deploy
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const prod = process.argv.includes("--prod");

function run(cmd, args, opts = {}) {
  const line = [cmd, ...args].join(" ");
  console.log(`\n$ ${line}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: true, ...opts });
  if (r.status !== 0) {
    console.error(`failed: ${line} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function need(name, hint) {
  if (!process.env[name]) {
    console.error(`missing env ${name}${hint ? ` — ${hint}` : ""}`);
    process.exit(1);
  }
}

need("VERCEL_TOKEN", "create one at https://vercel.com/account/tokens");
need("DATABASE_URL", "Neon pooled connection string");
need("DATABASE_URL_UNPOOLED", "Neon direct connection string");
need("AUTH_SECRET", "openssl rand -base64 48");

console.log("Papex → Vercel deploy");
console.log(`  root: ${root}`);
console.log(`  mode: ${prod ? "production" : "preview"}`);

// Non-interactive link/pull is driven entirely by token + project env.
const linkArgs = ["--yes"];
if (process.env.VERCEL_PROJECT_ID && process.env.VERCEL_ORG_ID) {
  linkArgs.push("--cwd", root);
}

run("vercel", ["whoami"]);
run("vercel", ["pull", "--yes", "--environment", prod ? "production" : "development"]);

// Push required runtime env if not already in the Vercel project.
// `vercel env add` reads the value from stdin.
for (const key of [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "AUTH_SECRET",
  "STORAGE_DRIVER",
  "PAPEX_S3_BUCKET",
  "PAPEX_S3_REGION",
  "PAPEX_S3_ENDPOINT",
  "PAPEX_S3_ACCESS_KEY_ID",
  "PAPEX_S3_SECRET_ACCESS_KEY",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_APP_URL",
]) {
  const value = process.env[key];
  if (!value) continue;
  console.log(`\n$ vercel env add ${key} ${prod ? "production" : "preview"}`);
  const r = spawnSync(`vercel env add ${key} ${prod ? "production" : "preview"}`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    cwd: root,
    shell: true,
  });
  if (r.status !== 0 && !String(r.stderr ?? "").includes("already exists")) {
    console.warn(`warn: could not set ${key} (exit ${r.status})`);
  }
}

const deployArgs = prod ? ["--prod"] : [];
run("vercel", deployArgs);

console.log(`
Done. Next:
  1. Open the deployment URL and check /api/health
  2. npm run demo:prepare is for LOCAL — on Vercel migrations run in buildCommand
  3. Seed data: run db:seed / db:seed-arxiv from a trusted machine against DATABASE_URL_UNPOOLED
  4. Point the Vercel GitHub App at this repo so PR checks stop sitting in queued
`);
