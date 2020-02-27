import { IncomingMessage } from "http";

export function readHeader(req: IncomingMessage, name: string) {
  return req.headers[name?.toLowerCase()] ?? "";
}