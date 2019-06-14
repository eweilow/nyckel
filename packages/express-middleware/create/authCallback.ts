import { RequestHandler } from "express";
import { NyckelExpressMiddlewareOptions } from "../middleware";
import {
  concatUrl,
  requestToken,
  verifyCSRFPair
} from "@nyckel/authentication";
import { asyncHandler } from "../asyncHandler";

export function createCallbackHandler(
  opts: NyckelExpressMiddlewareOptions
): RequestHandler {
  const { authConfig } = opts;

  return asyncHandler(async (req, res) => {
    if (!req.query.state) {
      throw new Error("Expected query to contain state!");
    }
    if (!req.query.code) {
      throw new Error("Expected query to contain code!");
    }

    const session = await req.session.get();
    if (session.csrfSecret == null) {
      throw new Error("Session must contain a csrfSecret!");
    }

    try {
      await verifyCSRFPair({
        secret: session.csrfSecret,
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
    res.redirect(concatUrl(req.realHost, "/"));
  });
}
