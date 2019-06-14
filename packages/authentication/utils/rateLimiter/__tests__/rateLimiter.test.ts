import { createRateLimiter } from "..";
import { calculateRateLimiterDelay } from "../delay";

jest.useFakeTimers();

jest.mock("../delay");

describe("rateLimiter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates from a response correctly", () => {
    const limiter = createRateLimiter();
    const update = (limiter.update = jest.fn());
    const headers = {
      "x-ratelimit-limit": 10,
      "x-ratelimit-remaining": 5,
      "x-ratelimit-reset": 1500
    };
    const getHeader = jest.fn(name => headers[name]);
    limiter.updateFromResponse("id", {
      headers: {
        get: getHeader
      }
    });

    expect(getHeader).toHaveBeenCalledWith("x-ratelimit-limit");
    expect(getHeader).toHaveBeenCalledWith("x-ratelimit-remaining");
    expect(getHeader).toHaveBeenCalledWith("x-ratelimit-reset");
    expect(update).toHaveBeenCalledWith("id", 10, 5, 1500 * 1000);
  });

  it("updates correctly", () => {
    const spy = jest.spyOn(Date, "now");
    spy.mockReturnValue(1000);

    const limiter = createRateLimiter();
    const storeSet = (limiter.store.set = jest.fn());

    limiter.update("id", 10, 6, 1000);

    const [id, params] = storeSet.mock.calls[0];
    expect(id).toBe("id");
    expect(params).toMatchInlineSnapshot(`
                  Object {
                    "limit": 10,
                    "now": 1000,
                    "remaining": 6,
                    "resetMillis": 1000,
                    "untilNextRefresh": 0,
                    "used": 4,
                  }
            `);
  });

  it("waits correctly with no delay", async () => {
    const limiter = createRateLimiter();
    const delay = (limiter.delay = jest.fn(() => 0));
    await limiter.wait("id");
    expect(delay).toHaveBeenCalledWith("id");
  });

  it("waits correctly with delay", async () => {
    const limiter = createRateLimiter();
    const delay = (limiter.delay = jest.fn(() => 10));

    let resolved = false;
    const promise = limiter.wait("id").then(() => {
      resolved = true;
    });
    jest.advanceTimersByTime(5);
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(10);
    await promise;
    expect(resolved).toBe(true);
    expect(delay).toHaveBeenCalledWith("id");
  });

  it("calculates delay correctly if id doesn't exist in store", async () => {
    const limiter = createRateLimiter();

    expect(limiter.store.has("nonexisting")).toBe(false);
    expect(limiter.delay("nonexisting")).toBe(0);
  });
  it("calculates delay correctly if id exists in store", async () => {
    const limiter = createRateLimiter();
    limiter.update("existing", 10, 5, 1000);

    (calculateRateLimiterDelay as jest.Mock).mockReturnValue(500);

    expect(limiter.store.has("existing")).toBe(true);
    expect(limiter.delay("nonexisting")).toBe(0);
    expect(limiter.delay("existing")).toMatchInlineSnapshot(`500`);

    expect((calculateRateLimiterDelay as jest.Mock).mock.calls[0])
      .toMatchInlineSnapshot(`
            Array [
              1000,
              1000,
              10,
              5,
              0,
            ]
        `);
  });
});
