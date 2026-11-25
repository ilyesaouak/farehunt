/**
 * Tiny in-memory TTL cache that stores promises, so concurrent identical
 * lookups share one upstream request. Failed or errored entries are evicted.
 */
export class PromiseCache<T> {
  private store = new Map<string, { expires: number; value: Promise<T> }>();

  constructor(private ttlMs: number, private maxEntries = 2000) {}

  get(key: string, load: () => Promise<T>, shouldCache: (v: T) => boolean = () => true): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expires > now) return hit.value;

    const value = load();
    this.store.set(key, { expires: now + this.ttlMs, value });
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    value.then(
      (v) => {
        if (!shouldCache(v)) this.store.delete(key);
      },
      () => this.store.delete(key),
    );
    return value;
  }
}

/** Runs async tasks with at most `limit` in flight. */
export function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    // A finished task hands its slot straight to the next waiter, so the
    // limit can never be exceeded by a caller sneaking in between.
    if (active >= limit) await new Promise<void>((r) => queue.push(r));
    else active++;
    try {
      return await task();
    } finally {
      const waiter = queue.shift();
      if (waiter) waiter();
      else active--;
    }
  };
}
