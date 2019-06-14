import { createClient, ClientOpts } from "redis";
import { EventEmitter } from "events";

export function createRedisClient(
  endpoint: string,
  handleError: (err: Error) => void,
  options?: ClientOpts
) {
  const client = createClient(endpoint, options);

  const healthyEventEmitter = new EventEmitter();

  let unhealthyTimeout: NodeJS.Timer | null = null;
  function markUnhealthy() {
    if (unhealthyTimeout != null) {
      return;
    }
    unhealthyTimeout = setTimeout(() => {
      healthy = false;
      healthyEventEmitter.emit("unhealthy");
      unhealthyTimeout = null;
    }, 5000);
  }

  let healthy: boolean = true;
  function markHealthy() {
    if (unhealthyTimeout != null) {
      clearTimeout(unhealthyTimeout);
      unhealthyTimeout = null;
    }

    if (!healthy) {
      healthy = true;
      healthyEventEmitter.emit("healthy");
    }
  }

  client.on("error", err => {
    handleError(err);
  });

  client.on("end", () => {
    markUnhealthy();
  });

  client.on("reconnecting", () => {
    markUnhealthy();
  });

  client.on("ready", () => {
    markHealthy();
  });

  markUnhealthy();

  return {
    client,
    get healthy() {
      return healthy;
    },
    healthyEventEmitter
  };
}
