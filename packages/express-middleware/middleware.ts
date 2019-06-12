import express from "express";

import { GlobalAuthenticationConfig } from "@nyckel/authentication";

import { SessionManager } from "@nyckel/sessions";

import { SessionInRequest, UserInRequest } from "@nyckel/http-middleware";
import { createCommonMiddleware } from "./create/common";
import { createLoginHandler } from "./create/authLogin";
import { createCallbackHandler } from "./create/authCallback";
import { createLoggedOutHandler } from "./create/authLoggedout";
import { createLogoutHandler } from "./create/authLogout";

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

export type NyckelExpressMiddlewareOptions = {
  secureCookies: boolean;
  sessionManager: SessionManager;
  trustProxyFn: (ip: string, val: 0) => boolean;
  authConfig: GlobalAuthenticationConfig;
  authManagementConfig: GlobalAuthenticationConfig;
};

export const nyckelExpressMiddleware = (
  opts: NyckelExpressMiddlewareOptions
): express.Router => {
  const router = express.Router();

  router.use(createCommonMiddleware(opts));
  router.get("/auth/login", createLoginHandler(opts));
  router.get("/auth/logout", createLogoutHandler(opts));
  router.get("/auth/loggedout", createLoggedOutHandler(opts));
  router.get("/auth/callback", createCallbackHandler(opts));

  return router;
};
