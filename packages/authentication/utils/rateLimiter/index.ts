import { calculateRateLimiterDelay } from "./delay";

export function createRateLimiter() {
  const store = new Map<
    string,
    {
      now: number;
      limit: number;
      remaining: number;
      used: number;
      resetMillis: number;
      untilNextRefresh: number;
    }
  >();

  let limiter = {
    get store() {
      return store;
    },
    delay(id: string) {
      if (!store.has(id)) {
        return 0;
      }

      const { now: then, limit, used, untilNextRefresh } = store.get(id)!;

      return calculateRateLimiterDelay(
        then,
        Date.now(),
        limit,
        used,
        untilNextRefresh
      );
    },
    async wait(id: string) {
      const delay = limiter.delay(id);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    },
    update(id: string, limit: number, remaining: number, resetMillis: number) {
      const used = limit - remaining;
      const resetsIn = resetMillis - Date.now();
      const untilNextRefresh = resetsIn / used;

      store.set(id, {
        now: Date.now(),
        limit,
        remaining,
        used,
        resetMillis,
        untilNextRefresh
      });
    },
    updateFromResponse(
      id: string,
      response: { headers: { get: (name: string) => string | null } }
    ) {
      const limit = parseInt(response.headers.get("x-ratelimit-limit")!, 10);
      const remaining = parseInt(
        response.headers.get("x-ratelimit-remaining")!,
        10
      );
      const resetTime =
        parseInt(response.headers.get("x-ratelimit-reset")!, 10) * 1000;

      limiter.update(id, limit, remaining, resetTime);
    }
  };

  return limiter;
}
