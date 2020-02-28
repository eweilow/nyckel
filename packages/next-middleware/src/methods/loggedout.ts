import { redirectResponse } from "../util";
import { concatUrl } from "@nyckel/authentication";
import { AuthState } from "@nyckel/service-middleware";
import { NextApiRequest, NextApiResponse } from "next";

export async function loggedOutMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthState,
  redirectPath = "/"
) {
  await auth.session.delete();
  redirectResponse(res, concatUrl(auth.host.actual, redirectPath), false);
}
