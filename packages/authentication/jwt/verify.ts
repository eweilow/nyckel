import { GlobalAuthenticationConfig } from "../utils/globalConfig";
import LRU from "lru-cache";
import { Verifier } from "./verifier";

export const verifierCache = new LRU<string, Verifier>({
  max: 10,
  maxAge: 7 * 24 * 60 * 60 * 1000 // A week
});

export type DecodedAccessToken = {
  exp: number;
  iss: string;
  aud: string[];
  sub?: string;
  iat?: string;
  scope?: string;
};

export type DecodedIdToken = DecodedAccessToken & {
  name: string;
  nickname: string;
  picture: string;
  email: string;
};

export async function verifyAndDecodeJWT(
  jwt: string,
  config: GlobalAuthenticationConfig
) {
  const key = config.authorizationDomain;
  let verifier!: Verifier;
  if (verifierCache.has(key)) {
    verifier = verifierCache.get(key) as Verifier;
  } else {
    verifier = new Verifier(config.urls.jwks, config.urls.issuer);
    verifierCache.set(key, verifier);
  }

  const decoded = await verifier.verifyJWT(jwt);
  return decoded;

  /*
  if (decoded.exp * 1000 < Date.now()) {
    const seconds = Math.floor(Date.now() / 1000 - decoded.exp);
    throw new Error(
      `Token was invalid: already expired ${seconds} seconds ago`
    );
  }

  if (new URL(decoded.iss).href !== new URL(config.authorizationDomain).href) {
    throw new Error(
      `Token was invalid: issuer '${decoded.iss}' does not match expected '${
        config.authorizationDomain
      }'`
    );
  }
  */
}
