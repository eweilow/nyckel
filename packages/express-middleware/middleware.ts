import express from "express";

import {
  authorizeUser,
  requestToken,
  verifyCSRFPair,
  logoutUser,
  concatUrl,
  getSafeHostname,
  GlobalAuthenticationConfig
} from "@nyckel/authentication";

import { SessionManager } from "@nyckel/sessions";

import {
  enhanceRequestWithSession,
  enhanceRequestWithUser,
  SessionInRequest,
  UserInRequest
} from "@nyckel/http-middleware";

declare global {
  namespace Express {
    export interface Request extends EnhancedRequest {}
    export interface Response {}
  }
}

interface EnhancedRequest {
  realHost: string;
  session: SessionInRequest;
  user: UserInRequest;
}

type Options = {
  secureCookies: boolean;
  sessionManager: SessionManager;
  trustProxyFn: (ip: string, val: 0) => boolean;
  authConfig: GlobalAuthenticationConfig;
  authManagementConfig: GlobalAuthenticationConfig;
};

export function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: () => void
  ) => Promise<void>
) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    handler(req, res, next).catch(err => next(err));
  };
}

export const nyckelExpressMiddleware = (opts: Options): express.Router => {
  const {
    secureCookies,
    sessionManager: sessions,
    trustProxyFn,
    authConfig,
    authManagementConfig
  } = opts;

  const router = express.Router();

  router.use((req, res, next) => {
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
      sessions,
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
      sessions,
      authConfig,
      authManagementConfig
    );

    next();
  });

  router.get(
    "/auth/login",
    asyncHandler(async (req, res) => {
      if (await req.user.get()) {
        // Do nothing if user is already logged in
        res.redirect("/");
        return;
      }

      const { csrfPair, redirectTo } = await authorizeUser(
        [],
        concatUrl(req.realHost, "/auth/callback"),
        authConfig
      );

      await req.session.set({
        csrfSecret: csrfPair.secret
      });

      res.redirect(redirectTo);
    })
  );

  router.get(
    "/auth/logout",
    asyncHandler(async (req, res) => {
      const { redirectTo } = await logoutUser(
        concatUrl(req.realHost, "/auth/loggedout"),
        authConfig
      );

      res.redirect(redirectTo);
    })
  );

  router.get(
    "/auth/loggedout",
    asyncHandler(async (req, res) => {
      await req.session.delete();
      res.redirect("/");
    })
  );

  router.get(
    "/auth/callback",
    asyncHandler(async (req, res) => {
      if (!req.query.state) {
        throw new Error("Expected query to contain state!");
      }
      if (!req.query.code) {
        throw new Error("Expected query to contain code!");
      }

      const session = await req.session.get();

      try {
        const { csrfSecret } = session;
        await verifyCSRFPair({
          secret: csrfSecret,
          token: req.query.state
        });
      } catch (err) {
        await req.session.delete();
        throw err;
      }

      const data = await requestToken(
        req.query.code,
        concatUrl(req.realHost, "/auth/callback"),
        authConfig
      );
      await req.session.set(data);
      res.redirect("/");
    })
  );

  return router;
};
