import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import { asyncHandler } from "../asyncHandler";

export function createLoggedOutHandler(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  return asyncHandler(async (req, res) => {
    await req.session.delete();
    res.redirect("/");
  });
}
