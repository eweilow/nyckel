import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import { concatUrl, logoutUser } from "@nyckel/authentication";
import { asyncHandler } from "../asyncHandler";

export function createLogoutHandler(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  const { authConfig } = opts;

  return asyncHandler(async (req, res) => {
    const { redirectTo } = await logoutUser(
      concatUrl(req.realHost, "/auth/loggedout"),
      authConfig
    );

    res.redirect(redirectTo);
  });
}
