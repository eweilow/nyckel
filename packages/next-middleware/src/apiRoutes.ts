import { logoutMethod } from "./methods/logout";
import {
  handleAuth,
  callbackMethod,
  loggedOutMethod,
  startLoginMethod
} from ".";
import { NextApiRequest, NextApiResponse } from "next";

import { AuthConfig } from "@nyckel/service-middleware";

export const callbackRoute = (authConfig: AuthConfig) =>
  async function callbackRoute(req: NextApiRequest, res: NextApiResponse) {
    const auth = await handleAuth(req, res, authConfig);
    await callbackMethod(
      req,
      res,
      auth,
      authConfig.callbackPath,
      authConfig.successfulRedirectPath
    );
    res.end();
  };

export const loggedOutRoute = (authConfig: AuthConfig) =>
  async function loggedOutRoute(req: NextApiRequest, res: NextApiResponse) {
    const auth = await handleAuth(req, res, authConfig);
    await loggedOutMethod(req, res, auth, authConfig.loggedOutRedirectPath);
    res.end();
  };

export const startLoginRoute = (authConfig: AuthConfig) =>
  async function startLoginRoute(req: NextApiRequest, res: NextApiResponse) {
    const auth = await handleAuth(req, res, authConfig);
    await startLoginMethod(
      req,
      res,
      auth,
      authConfig.callbackPath,
      authConfig.successfulRedirectPath
    );
    res.end();
  };

export const logoutRoute = (authConfig: AuthConfig) =>
  async function logoutRoute(req: NextApiRequest, res: NextApiResponse) {
    const auth = await handleAuth(req, res, authConfig);
    await logoutMethod(req, res, auth, authConfig.loggedOutPath);
    res.end();
  };
