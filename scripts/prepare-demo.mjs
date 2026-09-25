/**
 * Local / demo instance bootstrap for Papex.
 *
 * Starts the pgvector Postgres from docker-compose, applies migrations, and
 * (optionally) seeds categories + papers. Dependency-free.
 *
 * Usage:
 *   node scripts/prepare-demo.mjs            # db + migrate
 *   node scripts/prepare-demo.mjs --seed     # also run db:seed
 *   node scripts/prepare-demo.mjs --seed-arxiv  # also ingest arXiv samples
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));

function run(cmd, cmdArgs, opts = {}) {
  const line = [cmd, ...cmdArgs].join(" ");
  console.log(`\n$ ${line}`);
  // shell:true is required on Windows (npm.cmd / docker-compose.cmd). Keep the
  // argument list to a single joined string so we never hit DEP0190.
  const r = spawnSync(line, { stdio: "inherit", cwd: root, shell: true, ...opts });
  if (r.status !== 0) {
    console.error(`failed: ${line} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function hasDocker() {
  const r = spawnSync("docker", ["info"], { stdio: "ignore", shell: true });
  return r.status === 0;
}

function composeCmd() {
  // Docker Desktop may expose the plugin (`docker compose`) or the standalone
  // binary (`docker-compose`). Prefer whichever answers `version`.
  const plugin = spawnSync("docker", ["compose", "version"], { stdio: "ignore", shell: true });
  if (plugin.status === 0) return { cmd: "docker", prefix: ["compose"] };
  const standalone = spawnSync("docker-compose", ["version"], { stdio: "ignore", shell: true });
  if (standalone.status === 0) return { cmd: "docker-compose", prefix: [] };
  return null;
}

console.log("Papex demo bootstrap");
console.log(`  root: ${root}`);

if (!existsSync(path.join(root, ".env"))) {
  console.error("missing .env — copy .env.example and fill DATABASE_URL / AUTH_SECRET first");
  process.exit(1);
}

if (!hasDocker()) {
  console.error("docker daemon is not running — start Docker Desktop, then re-run");
  process.exit(1);
}

const compose = composeCmd();
if (!compose) {
  console.error("neither `docker compose` nor `docker-compose` is available");
  process.exit(1);
}

// Reuses the papex-db volume defined in docker-compose.yml.
run(compose.cmd, [...compose.prefix, "up", "-d", "db"]);

// Wait briefly for health.
for (let i = 0; i < 30; i++) {
  const ready = spawnSync("docker", ["exec", "papex-db-1", "pg_isready", "-U", "papex", "-d", "papex"], {
    stdio: "ignore",
    shell: true,
  });
  if (ready.status === 0) break;
  if (i === 29) {
    console.error("postgres did not become ready in 30s");
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1000));
}

run("npm", ["run", "db:migrate"]);

if (args.has("--seed")) run("npm", ["run", "db:seed"]);
if (args.has("--seed-arxiv")) run("npm", ["run", "db:seed-arxiv"]);

console.log(`
Done. Next:
  npm run build && npm start     # production
  npm run dev                    # development
  open http://localhost:3000/api/health
  BASE_URL=http://localhost:3000 npx tsx scripts/benchmark.ts
`);
