import { URL } from "url";
import { concatUrl } from "./concatUrl";

export type GlobalAuthenticationConfig = {
  clientId: string;
  clientSecret: string;
  audience: string;
  authorizationDomain: string;
  urls: {
    logout: string;
    authorization: string;
    token: string;
    jwks: string;
    issuer: string;
    userinfo: string;
  };
};

export function createGlobalAuthenticationConfig(
  clientId: string,
  clientSecret: string,
  domain: string,
  audience?: string
): GlobalAuthenticationConfig {
  const authorizationDomain = new URL(domain).origin;
  return {
    clientId,
    clientSecret,
    audience:
      audience != null ? audience : concatUrl(authorizationDomain, "/userinfo"),
    authorizationDomain,
    urls: {
      logout: concatUrl(authorizationDomain, "/v2/logout"),
      authorization: concatUrl(authorizationDomain, "/authorize"),
      token: concatUrl(authorizationDomain, "/oauth/token"),
      jwks: concatUrl(authorizationDomain, "/.well-known/jwks.json"),
      issuer: concatUrl(authorizationDomain, "/"),
      userinfo: concatUrl(authorizationDomain, "/userinfo")
    }
  };
}
