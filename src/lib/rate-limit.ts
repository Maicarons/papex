// 轻量、零依赖的内存限流（固定窗口计数器）。
//
// 注意：计数状态保存在单个服务进程内。对于单进程自托管（Docker `next start`）
// 这是有效的；但在水平扩展 / 边缘平台（如 Vercel 多区域）下计数器不共享——
// 若需要更强保证，应升级为分布式存储（Upstash Redis 等）。
//
// 这是「基础鉴权限流」层，目标是挡住最常见的滥用（爆破登录、刷注册、刷反馈），
// 而非替代专业的 WAF / 网关限流。

export interface RateLimitResult {
  /** 是否在允许额度内 */
  ok: boolean;
  /** 本窗口剩余可用次数 */
  remaining: number;
  /** 距窗口重置还需多少秒（超限时客户端应等待的时间） */
  retryAfterSec: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
const MAX_ENTRIES = 10_000;

/**
 * 按 key 进行固定窗口限流。
 * @param key   限流维度（如 `ip:auth`、`ip:api`）
 * @param limit 窗口内允许的最大请求数
 * @param windowMs 窗口长度（毫秒）
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // 新窗口：重置计数
    store.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now);
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/** 超出容量阈值时清理已过期条目，避免 Map 无限增长。 */
function sweep(now: number) {
  if (store.size <= MAX_ENTRIES) return;
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}
