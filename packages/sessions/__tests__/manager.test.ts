import Redlock from "redlock";

import uuid from "uuid/v4";

jest.mock("../redis", () => {
  return {
    createRedisClient: jest.fn(() => ({
      client: {
        isThisARedisClient: true
      }
    }))
  };
});

jest.mock("redlock");

import { createSessionManager } from "..";
import { createRedisClient } from "../redis";
import { createKeyHash } from "../crypto/key";

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
    const { client } = createSessionManager("url:redisEndpoint", () => {}, {
      salt: "option:salt",
      secret: "option:secret",
      ttl: 1000
    });
    expect((Redlock as any) as jest.Mock).toHaveBeenCalledWith([client], {
      retryCount: 0
    });
  });

  describe("properties", () => {
    describe(".client", () => {
      it("returns the client provided by Redis", () => {
        const { client: returnedClient } = createSessionManager(
          "url:redisEndpoint",
          () => {},
          {
            salt: "option:salt",
            secret: "option:secret",
            ttl: 1000
          }
        );
        const {
          client
        } = ((createRedisClient as any) as jest.Mock).mock.results[0].value;

        expect(client).toBe(returnedClient);
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
  const keyToHash = (key: string) => createKeyHash(key, salt);
  function createManager() {
    return createSessionManager("url:redisEndpoint", () => {}, {
      salt,
      secret: "option:secret",
      ttl: 1000
    });
  }

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
