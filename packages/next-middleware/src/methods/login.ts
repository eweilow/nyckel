import { redirectResponse } from "../util";
import { concatUrl, authorizeUser } from "@nyckel/authentication";
import { AuthState } from "@nyckel/service-middleware";
import { NextApiRequest, NextApiResponse } from "next";

export async function startLoginMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthState,
  callbackPath: string = "/api/callback",
  redirectPath = "/"
) {
  const user = await auth.user.get();
  if (user != null) {
    // Do nothing if user is already logged in
    redirectResponse(res, concatUrl(auth.host.actual, redirectPath), false);
    return;
  }

  const { csrfPair, redirectTo } = await authorizeUser(
    [],
    concatUrl(auth.host.actual, callbackPath),
    auth.config
  );

  await auth.session.set({
    csrfSecret: csrfPair.secret
  });

  redirectResponse(res, redirectTo, false);
}
