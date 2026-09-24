/**
 * Sliding-window rate limiter keyed by caller (per-user in practice).
 *
 * In-memory and per-process only: adequate for a single-node deployment.
 * Multi-process deployments would need a shared store.
 */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly limit: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const current = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (current.length >= this.limit) {
      this.hits.set(key, current);
      return false;
    }

    current.push(now);
    this.hits.set(key, current);
    return true;
  }
}

export const resolveLinkLimiter = new SlidingWindowLimiter(60_000, 12);
export const resolveVideoLimiter = new SlidingWindowLimiter(60_000, 12);
export const importImageLimiter = new SlidingWindowLimiter(60_000, 12);
