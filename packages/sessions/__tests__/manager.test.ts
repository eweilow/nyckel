import Redlock from "redlock";

import uuid from "uuid/v4";

import { createSessionManager } from "..";
import { createRedisClient } from "../redis";
import { createKeyHash } from "../crypto/key";
import { encryptData } from "../crypto/value";

jest.mock("uuid/v4", () =>
  jest.fn(() => {
    return jest.requireActual("uuid/v4")();
  })
);

jest.mock("../redis", () => {
  return {
    createRedisClient: jest.fn(() => ({
      client: {
        isThisARedisClient: true
      }
    }))
  };
});

jest.mock("../crypto/value", () => {
  return {
    encryptData: jest.fn((...params) => JSON.stringify(params)),
    decryptData: jest.fn((id, salt, secret, encrypted) => JSON.parse(encrypted))
  };
});

jest.mock("redlock", () => {
  return jest.fn();
});

describe("createSessionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has the correct signature", () => {
    expect(
      createSessionManager("url:redisEndpoint", () => {}, {
        salt: "option:salt",
        secret: "option:secret",
        ttl: 1000
      })
    ).toMatchSnapshot();
  });

  it("calls Redlock correctly", () => {
    const {
      redisClient: { client: returnedClient }
    } = createSessionManager("url:redisEndpoint", () => {}, {
      salt: "option:salt",
      secret: "option:secret",
      ttl: 1000
    });
    expect((Redlock as any) as jest.Mock).toHaveBeenCalledWith(
      [returnedClient],
      {
        retryCount: 0
      }
    );
  });

  describe("properties", () => {
    describe(".client", () => {
      it("returns the client provided by Redis", () => {
        const {
          redisClient: { client: returnedClient }
        } = createSessionManager("url:redisEndpoint", () => {}, {
          salt: "option:salt",
          secret: "option:secret",
          ttl: 1000
        });
        const {
          client
        } = ((createRedisClient as any) as jest.Mock).mock.results[0].value;

        expect(client).toBe(returnedClient);
      });
    });

    describe(".generateId()", () => {
      it("returns a valid id", () => {
        const manager = createSessionManager("url:redisEndpoint", () => {}, {
          salt: "option:salt",
          secret: "option:secret",
          ttl: 1000
        });
        const id = manager.generateId();
        expect(typeof id).toBe("string");
        expect(manager.isValidId(id)).toBe(true);
      });
      it("generates a UUID/v4", () => {
        const manager = createSessionManager("url:redisEndpoint", () => {}, {
          salt: "option:salt",
          secret: "option:secret",
          ttl: 1000
        });
        manager.generateId();
        expect(uuid).toBeCalledTimes(1);
      });
    });

    describe(".isValidId(id)", () => {
      const { isValidId } = createSessionManager(
        "url:redisEndpoint",
        () => {},
        {
          salt: "option:salt",
          secret: "option:secret",
          ttl: 1000
        }
      );

      it("returns false for null or undefined id", () => {
        expect(isValidId(null as any)).toBe(false);
        expect(isValidId(undefined as any)).toBe(false);
      });

      it("returns false for non-string id", () => {
        expect(isValidId(3 as any)).toBe(false);
        expect(isValidId((() => {}) as any)).toBe(false);
        expect(isValidId(false as any)).toBe(false);
      });

      it("returns false for strings longer than 36", () => {
        expect(isValidId("x".repeat(37))).toBe(false);
        expect(isValidId("x".repeat(36))).toBe(true);
      });

      it("returns false for strings that are not alphanumeric and 36 chars long", () => {
        expect(isValidId("x".repeat(37))).toBe(false);
        expect(isValidId("x".repeat(36))).toBe(true);
        expect(isValidId("x".repeat(35))).toBe(false);

        expect(isValidId("åäö")).toBe(false);
      });

      it("returns true for UUID strings (random checks)", () => {
        const allowedTime = 500;
        let started = Date.now();

        while (Date.now() < started + allowedTime) {
          const string = uuid();
          expect({
            string,
            valid: isValidId(string)
          }).toEqual({
            string,
            valid: true
          });
        }
      });
    });
  });

  const salt = "option:salt";
  const secret = "option:secret";
  const ttl = 1000;
  const keyToHash = (key: string) => createKeyHash(key, salt);
  function createManager() {
    return createSessionManager("url:redisEndpoint", () => {}, {
      salt,
      secret,
      ttl
    });
  }

  describe(".lock(id, ttl)", () => {
    function setupMock(canLock: boolean) {
      const unlock = jest.fn();
      const client = {
        unlock,
        lock: jest.fn(() => {
          if (canLock) {
            return {
              unlock
            };
          }
          throw new Error("Cannot lock");
        })
      };
      ((Redlock as any) as jest.Mock).mockImplementationOnce(() => {
        return client;
      });
      return { client, unlock };
    }

    it("it locks if Redlock can acquire a lock", async () => {
      const { client, unlock } = setupMock(true);
      const manager = createManager();

      const promise = manager.lock("id", 1000);
      await expect(promise).resolves.toEqual({
        acquired: true,
        release: expect.any(Function)
      });

      expect(client.lock).toBeCalledWith("locks:" + keyToHash("id"), 1000);
      expect(client.unlock).not.toBeCalled();
    });

    it("it can release an acquired lock", async () => {
      const { client, unlock } = setupMock(true);
      const manager = createManager();

      const lock = (await manager.lock("id", 1000)) as {
        acquired: true;
        release: () => Promise<void>;
      };
      expect(lock.acquired).toBe(true);
      expect(client.unlock).not.toBeCalled();

      await lock.release();
      expect(client.lock).toBeCalledWith("locks:" + keyToHash("id"), 1000);
      expect(client.unlock).toBeCalled();
    });

    it("it doesn't lock if Redlock fails to acquire a lock", async () => {
      const { client, unlock } = setupMock(false);
      const manager = createManager();

      const promise = manager.lock("id", 1000);
      await expect(promise).resolves.toEqual({
        acquired: false,
        err: expect.any(Error)
      });

      expect(client.lock).toBeCalledWith("locks:" + keyToHash("id"), 1000);
      expect(client.unlock).not.toBeCalled();
    });
  });

  describe(".set(id, data)", () => {
    function setupMock() {
      const client = {
        setex: jest.fn((key, ttl, encrypted, cb) => cb(null))
      };
      ((createRedisClient as any) as jest.Mock).mockReturnValueOnce({
        client
      });
      return client;
    }

    it("resolves if key exists", async () => {
      const client = setupMock();
      const manager = createManager();
      expect(
        await manager.set("exists", { data: "thisIsData" })
      ).toBeUndefined();
      expect(client.setex).toBeCalledTimes(1);
      expect(client.setex).toBeCalledWith(
        keyToHash("exists"),
        ttl,
        encryptData(
          ...(((encryptData as any) as jest.Mock).mock.calls[0] as [
            any,
            any,
            any,
            any
          ])
        ), // the mock implementation simply strinigfies the arguments
        expect.any(Function)
      );
    });

    it("resolves if key does not exist", async () => {
      const client = setupMock();
      const manager = createManager();
      expect(
        await manager.set("non-existant", { data: "thisIsData" })
      ).toBeUndefined();
      expect(client.setex).toBeCalledTimes(1);
      expect(client.setex).toBeCalledWith(
        keyToHash("non-existant"),
        ttl,
        encryptData(
          ...(((encryptData as any) as jest.Mock).mock.calls[0] as [
            any,
            any,
            any,
            any
          ])
        ), // the mock implementation simply strinigfies the arguments
        expect.any(Function)
      );
    });
  });

  describe(".get(id)", () => {
    function setupMock() {
      const client = {
        get: jest.fn((key, cb) =>
          cb(
            null,
            key === keyToHash("exists")
              ? JSON.stringify({ encryptedData: "yes" })
              : null
          )
        ),
        expire: jest.fn((key, ttl, cb) => cb(null))
      };
      ((createRedisClient as any) as jest.Mock).mockReturnValueOnce({
        client
      });
      return client;
    }

    it("resolves if key exists", async () => {
      const client = setupMock();
      const manager = createManager();

      const data = await manager.get("exists");
      expect(data).toEqual({ encryptedData: "yes" });
      expect(client.get).toBeCalledTimes(1);
      expect(client.get).toBeCalledWith(
        keyToHash("exists"),
        expect.any(Function)
      );
      expect(client.expire).toBeCalledTimes(1);
      expect(client.expire).toBeCalledWith(
        keyToHash("exists"),
        ttl,
        expect.any(Function)
      );
    });

    it("resolves if key does not exist", async () => {
      const client = setupMock();
      const manager = createManager();
      const data = await manager.get("non-existant");
      expect(data).toBeNull();
      expect(client.get).toBeCalledTimes(1);
      expect(client.get).toBeCalledWith(
        keyToHash("non-existant"),
        expect.any(Function)
      );
      expect(client.expire).not.toBeCalled();
    });
  });

  describe(".delete(id)", () => {
    function setupMock() {
      const client = {
        del: jest.fn((key, cb) => cb(null))
      };
      ((createRedisClient as any) as jest.Mock).mockReturnValueOnce({
        client
      });
      return client;
    }

    it("resolves if key exists", async () => {
      const client = setupMock();
      const manager = createManager();
      expect(await manager.delete("exists")).toBeUndefined();
      expect(client.del).toBeCalledTimes(1);
      expect(client.del).toBeCalledWith(
        keyToHash("exists"),
        expect.any(Function)
      );
    });

    it("resolves if key does not exist", async () => {
      const client = setupMock();
      const manager = createManager();
      expect(await manager.delete("non-existant")).toBeUndefined();
      expect(client.del).toBeCalledTimes(1);
      expect(client.del).toBeCalledWith(
        keyToHash("non-existant"),
        expect.any(Function)
      );
    });
  });

  describe(".has(id)", () => {
    function setupMock() {
      const client = {
        exists: jest.fn((key, cb) => cb(null, key === keyToHash("exists")))
      };
      ((createRedisClient as any) as jest.Mock).mockReturnValueOnce({
        client
      });
      return client;
    }

    it("resolves true if key exists", async () => {
      const client = setupMock();
      const manager = createManager();
      expect(await manager.has("exists")).toBe(true);
      expect(client.exists).toBeCalledTimes(1);
      expect(client.exists).toBeCalledWith(
        keyToHash("exists"),
        expect.any(Function)
      );
    });

    it("resolves false if key does not exist", async () => {
      const client = setupMock();
      const manager = createManager();
      expect(await manager.has("non-existant")).toBe(false);
      expect(client.exists).toBeCalledTimes(1);
      expect(client.exists).toBeCalledWith(
        keyToHash("non-existant"),
        expect.any(Function)
      );
    });
  });
});
