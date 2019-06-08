import { createRedisClient } from "./redis";
import { ClientOpts } from "redis";
import { createKeyHash } from "./crypto/key";
import { encryptData, decryptData } from "./crypto/value";

import uuid from "uuid/v4";

async function wrapInPromise<T = any>(
  run: (cb: (err: any, data: T) => void) => void
) {
  return await new Promise<T>((resolve, reject) => {
    run((err, data) => {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}
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

  return {
    generateId() {
      return uuid();
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

      await wrapInPromise(cb => client.exists(key, cb));
    }
  };
}
