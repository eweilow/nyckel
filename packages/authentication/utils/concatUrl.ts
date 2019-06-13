import { URL } from "url";

export function concatUrl(origin: string, path: string) {
  const url = new URL(origin);
  url.pathname = path;

  return new URL(url.href).href;
}
