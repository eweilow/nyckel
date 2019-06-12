import { RequestHandler } from "express";
import {
  getSafeHostname,
  GlobalAuthenticationConfig
} from "@nyckel/authentication";
import {
  enhanceRequestWithSession,
  enhanceRequestWithUser
} from "../../http-middleware";
import { NyckelExpressMiddlewareOptions } from "../middleware";

export function createCommonMiddleware(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  const {
    secureCookies,
    sessionManager,
    trustProxyFn,
    authConfig,
    authManagementConfig
  } = opts;

  return (req, res, next) => {
    req.realHost = getSafeHostname(
      req.protocol,
      req.get("X-Forwarded-Host"),
      req.get("Host"),
      trustProxyFn
    );

    const cookieName = process.env.COOKIE_NAME!;
    const cookie = req.cookies[cookieName];

    req = enhanceRequestWithSession(
      req,
      cookieName,
      cookie,
      sessionManager,
      (name, value) =>
        res.cookie(cookieName, value, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 180,
          secure: secureCookies || res.get("X-Forwarded-Proto") === "https"
        }),
      name => res.clearCookie(name)
    );

    req = enhanceRequestWithUser(
      req,
      cookieName,
      cookie,
      sessionManager,
      authConfig,
      authManagementConfig
    );

    next();
  };
}
