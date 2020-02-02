import { redirectResponse } from "../util";
import { concatUrl } from "@nyckel/authentication";
import { AuthState } from "../middleware";
import { NextApiRequest, NextApiResponse } from "next";

export async function loggedOutMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  auth: AuthState
) {
  await auth.session.delete();
  redirectResponse(res, concatUrl(auth.host.actual, "/"), false);
}
