import { redirectResponse } from "../util";
import { concatUrl, authorizeUser } from "@nyckel/authentication";
import { AuthState } from "../middleware";
import { NextApiRequest, NextApiResponse } from "next";

export async function startLoginMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthState
) {
  const user = await auth.user.get();
  if (user != null) {
    // Do nothing if user is already logged in
    redirectResponse(res, concatUrl(auth.host.actual, "/"), false);
    return;
  }

  const { csrfPair, redirectTo } = await authorizeUser(
    [],
    concatUrl(auth.host.actual, "/api/callback"),
    auth.config
  );

  await auth.session.set({
    csrfSecret: csrfPair.secret
  });

  redirectResponse(res, redirectTo, false);
}
