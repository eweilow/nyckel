import { createRedisClient } from "./redis";
import { ClientOpts } from "redis";
import { createKeyHash } from "./crypto/key";
import { encryptData, decryptData } from "./crypto/value";

import uuid from "uuid/v4";

import Redlock from "redlock";
import { wrapInPromise } from "./utils/wrapInPromise";

export type SessionManager = ReturnType<typeof createSessionManager>;

export function createSessionManager(
  redisEndpoint: string,
  handleError: (err: Error) => void,
  options: {
    secret: string;
    salt: string;
    ttl: number;
    redisOptions?: ClientOpts;
  }
) {
  const { client } = createRedisClient(
    redisEndpoint,
    handleError,
    options.redisOptions
  );

  const redlock = new Redlock([client], {
    retryCount: 0
  });

  return {
    get client() {
      return client;
    },
    isValidId(id?: string) {
      if (id == null) {
        return false;
      }
      if (typeof id !== "string") {
        return false;
      }
      if (id.length > 36) {
        return false;
      }
      return /^[a-z0-9\-]{36}$/i.test(id);
    },
    generateId() {
      return uuid();
    },
    async lock(
      id: string,
      ttl: number
    ): Promise<
      { acquired: true; release: () => Promise<void> } | { acquired: false }
    > {
      const key = createKeyHash(id, options.salt);
      try {
        const lock = await redlock.lock("locks:" + key, ttl);
        return {
          acquired: true,
          async release() {
            await lock.unlock();
          }
        };
      } catch (err) {
        return {
          acquired: false
        };
      }
    },
    async set<T = any>(id: string, data: any) {
      const key = createKeyHash(id, options.salt);

      const encrypted = encryptData<T>(id, options.salt, options.secret, data);
      await wrapInPromise(cb => client.setex(key, options.ttl, encrypted, cb));
    },
    async get<T = any>(id: string) {
      const key = createKeyHash(id, options.salt);

      const encrypted = await wrapInPromise<string>(cb => client.get(key, cb));
      if (encrypted == null) {
        return null;
      }

      await wrapInPromise(cb => client.expire(key, options.ttl, cb));

      return decryptData<T>(id, options.salt, options.secret, encrypted);
    },
    async delete(id: string) {
      const key = createKeyHash(id, options.salt);

      await wrapInPromise(cb => client.del(key, cb));
    },
    async has(id: string) {
      const key = createKeyHash(id, options.salt);

      return wrapInPromise(cb => client.exists(key, cb));
    }
  };
}
