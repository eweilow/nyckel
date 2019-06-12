import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import { asyncHandler } from "..";
import { concatUrl, logoutUser } from "@nyckel/authentication";

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
