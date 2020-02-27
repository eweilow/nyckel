import { redirectResponse } from "../util";
import { concatUrl, logoutUser } from "@nyckel/authentication";
import { AuthState } from "@nyckel/service-middleware";
import { NextApiRequest, NextApiResponse } from "next";

export async function logoutMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthState
) {
  const { redirectTo } = await logoutUser(
    concatUrl(auth.host.actual, "/api/loggedout"),
    auth.config
  );
  redirectResponse(res, redirectTo, false);
}
