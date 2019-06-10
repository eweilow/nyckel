import { GlobalAuthenticationConfig } from "../utils/globalConfig";

import { stringify } from "querystring";
import { URL } from "url";

export async function logoutUser(
  redirectUrl: string,
  config: GlobalAuthenticationConfig
) {
  const query = stringify({
    client_id: config.clientId,
    returnTo: redirectUrl
  });

  const url = new URL(config.urls.logout);
  url.search = query;

  const redirectTo = url.href;

  return {
    redirectTo
  };
}
