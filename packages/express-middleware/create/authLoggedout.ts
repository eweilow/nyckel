import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import { asyncHandler } from "../asyncHandler";
import { concatUrl } from "@nyckel/authentication";

export function createLoggedOutHandler(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  return asyncHandler(async (req, res) => {
    await req.session.delete();
    res.redirect(concatUrl(req.realHost, "/"));
  });
}
