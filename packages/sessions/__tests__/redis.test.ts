import { createClient } from "redis";
import { createRedisClient } from "../redis";
import { EventEmitter } from "events";

jest.mock("redis", () => {
  return {
    createClient: jest.fn()
  };
});

jest.useFakeTimers();

describe("createRedisClient", () => {
  it("should pass through options", () => {
    ((createClient as any) as jest.Mock).mockReturnValueOnce({
      on: jest.fn(),
      off: jest.fn()
    });

    const options = { test: 1 };
    createRedisClient("endpoint", jest.fn(), options as any);

    expect(createClient).toHaveBeenCalledWith("endpoint", options);
  });

  it("should return correct signature", () => {
    const val = {
      on: jest.fn(),
      off: jest.fn()
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.client).toBe(val);
    expect(returnValue.healthy).toBe(true);
    expect(returnValue.healthyEventEmitter).toBeInstanceOf(EventEmitter);
  });

  it("should mark as healthy correctly", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    emitter.emit("ready");
    expect(returnValue.healthy).toBe(true);
  });

  it("should mark as unhealthy after short period", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(5000);
    expect(returnValue.healthy).toBe(false);
  });

  it("should mark as unhealthy after reconnecting, when not marked as ready again", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.healthy).toBe(true);
    emitter.emit("ready");
    emitter.emit("reconnecting");
    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(5000);
    expect(returnValue.healthy).toBe(false);
  });

  it("should mark as healthy after reconnecting and not marked as ready again", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.healthy).toBe(true);
    emitter.emit("ready");
    emitter.emit("reconnecting");
    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(4900);
    emitter.emit("reconnecting");
    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(100);
    expect(returnValue.healthy).toBe(false);
  });

  it("should mark as healthy after reconnecting until unhealthy", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.healthy).toBe(true);
    emitter.emit("ready");
    emitter.emit("reconnecting");
    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(5000);
    expect(returnValue.healthy).toBe(false);
    emitter.emit("ready");
    expect(returnValue.healthy).toBe(true);
    emitter.emit("ready");
    expect(returnValue.healthy).toBe(true);
  });

  it("should mark as healthy while reconnecting", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.healthy).toBe(true);
    emitter.emit("ready");
    emitter.emit("reconnecting");
    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(4900);
    emitter.emit("ready");
    jest.advanceTimersByTime(100);
    expect(returnValue.healthy).toBe(true);
  });

  it("should mark as unhealthy after end", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const returnValue = createRedisClient("endpoint", jest.fn());

    expect(returnValue.healthy).toBe(true);
    emitter.emit("ready");
    emitter.emit("end");
    expect(returnValue.healthy).toBe(true);
    jest.advanceTimersByTime(5000);
    expect(returnValue.healthy).toBe(false);
  });

  it("should emit errors on handleError", () => {
    const emitter = new EventEmitter();
    const val = {
      on: jest.fn((type, cb) => emitter.addListener(type, cb)),
      off: jest.fn((type, cb) => emitter.removeListener(type, cb))
    } as any;
    ((createClient as any) as jest.Mock).mockReturnValueOnce(val);

    const handleError = jest.fn();
    const returnValue = createRedisClient("endpoint", handleError);

    const e = new Error("test");
    emitter.emit("error", e);
    expect(handleError).toBeCalledWith(e);
  });
});
