import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import { asyncHandler } from "..";
import { authorizeUser, concatUrl } from "@nyckel/authentication";

export function createLoginHandler(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  const { authConfig } = opts;

  return asyncHandler(async (req, res) => {
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
  });
}
