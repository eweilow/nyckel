import { RequestHandler } from "express";
import { getSafeHostname } from "@nyckel/authentication";
import {
  enhanceRequestWithSession,
  enhanceRequestWithUser
} from "@nyckel/http-middleware";
import { NyckelExpressMiddlewareOptions } from "../middleware";

export function createCommonMiddleware(
  opts: NyckelExpressMiddlewareOptions,
  expirationMargin: number = 10 * 60 * 1000
): RequestHandler {
  const {
    cookieName,
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
      req.connection.remoteAddress,
      trustProxyFn
    );

    const cookie = req.cookies[cookieName];

    enhanceRequestWithSession(
      req,
      cookieName,
      cookie,
      sessionManager,
      (name, value) =>
        res.cookie(name, value, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 180,
          secure: secureCookies || req.get("X-Forwarded-Proto") === "https"
        }),
      name => res.clearCookie(name)
    );
    enhanceRequestWithUser(
      req,
      cookieName,
      cookie,
      sessionManager,
      authConfig,
      authManagementConfig,
      expirationMargin
    );

    next();
  };
}
