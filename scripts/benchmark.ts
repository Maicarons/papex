/**
 * HTTP latency benchmark for the Papex API (P2-C: performance & scalability).
 *
 * Measures p50 / p90 / max latency of a set of read endpoints under bounded
 * concurrency, using the built-in fetch. Dependency-free; runs anywhere with
 * Node 18+.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npx tsx scripts/benchmark.ts \
 *     "/api/papers?pageSize=10,/api/search?q=transformer&semantic=1,/api/categories,/api/feed" \
 *     8 20
 * (endpoints=comma list, concurrency, iterations per endpoint)
 */
import { performance } from "node:perf_hooks";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const endpoints = (process.argv[2] ?? "/api/papers?pageSize=10,/api/search?q=transformer&semantic=1,/api/categories,/api/feed").split(",").map((s) => s.trim()).filter(Boolean);
const concurrency = Math.max(1, Number(process.argv[3] ?? 8));
const iterations = Math.max(1, Number(process.argv[4] ?? 20));

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function hit(path: string): Promise<number> {
  const start = performance.now();
  const res = await fetch(`${base}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  await res.arrayBuffer(); // consume body
  return performance.now() - start;
}

async function bench(path: string): Promise<void> {
  const times: number[] = [];
  const failures: string[] = [];
  const worker = async () => {
    for (let i = 0; i < iterations; i++) {
      try {
        times.push(await hit(path));
      } catch (e) {
        failures.push(String(e instanceof Error ? e.message : e).slice(0, 120));
      }
    }
  };
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const sorted = [...times].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p90 = percentile(sorted, 90);
  const max = sorted.at(-1) ?? 0;
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  console.log(
    `${path}\n  n=${times.length}  avg=${avg.toFixed(1)}ms  p50=${p50.toFixed(1)}ms  p90=${p90.toFixed(1)}ms  max=${max.toFixed(1)}ms` +
      (failures.length ? `  failures=${failures.length} (${failures[0]})` : ""),
  );
}

async function main() {
  console.log(`Benchmark: ${base} | concurrency=${concurrency} | iterations=${iterations}/endpoint\n`);
  const t0 = performance.now();
  for (const ep of endpoints) {
    await bench(ep);
  }
  console.log(`\nTotal: ${((performance.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
