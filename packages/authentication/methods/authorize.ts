import { GlobalAuthenticationConfig } from "../utils/globalConfig";

import { stringify } from "querystring";
import { URL } from "url";
import { generateCSRFPair } from "../state/generate";

function unique(...strs: string[]): string {
  return [...new Set(strs)].join(" ");
}

export async function authorizeUser(
  scope: string[],
  redirectUrl: string,
  config: GlobalAuthenticationConfig
) {
  const csrfPair = await generateCSRFPair();

  const query = stringify({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUrl,
    scope: unique(...scope, "openid", "profile", "email", "offline_access"),
    state: csrfPair.token,
    audience: config.audience
  });

  const url = new URL(config.urls.authorization);
  url.search = query;

  const redirectTo = url.href;

  return {
    csrfPair,
    redirectTo
  };
}
