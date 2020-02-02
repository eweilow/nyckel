import { redirectResponse } from "../util";
import {
  concatUrl,
  verifyCSRFPair,
  requestToken
} from "@nyckel/authentication";
import { AuthState } from "../middleware";
import { NextApiRequest, NextApiResponse } from "next";

export async function callbackMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthState
) {
  if (!req.query.state) {
    throw new Error("Expected query to contain state!");
  }
  if (!req.query.code) {
    throw new Error("Expected query to contain code!");
  }

  const session = await auth.session.get();
  if (session.csrfSecret == null) {
    throw new Error("Session must contain a csrfSecret!");
  }

  try {
    await verifyCSRFPair({
      secret: session.csrfSecret,
      token: req.query.state as string
    });
  } catch (err) {
    await auth.session.delete();
    throw err;
  }

  const data = await requestToken(
    req.query.code as string,
    concatUrl(auth.host.actual, "/api/callback"),
    auth.config
  );
  await auth.session.set(data);

  redirectResponse(res, concatUrl(auth.host.actual, "/"), false);
}
