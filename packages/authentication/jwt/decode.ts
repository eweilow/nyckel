import { decode } from "jsonwebtoken";
import { DecodedAccessToken } from "./verify";

export function decodeJWT<T extends DecodedAccessToken>(jwt: string): T {
  return decode(jwt) as T;
}
