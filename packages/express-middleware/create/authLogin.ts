import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import { authorizeUser, concatUrl } from "@nyckel/authentication";
import { asyncHandler } from "../asyncHandler";

export function createLoginHandler(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  const { authConfig } = opts;

  return asyncHandler(async (req, res) => {
    const user = await req.user.get();
    if (user != null) {
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
