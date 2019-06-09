import { decode } from "jsonwebtoken";
import { DecodedJWT } from "./verify";

export function decodeJWT(jwt: string): DecodedJWT {
  return decode(jwt) as DecodedJWT;
}
