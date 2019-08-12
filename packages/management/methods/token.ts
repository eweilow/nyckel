import {
  GlobalAuthenticationConfig,
  concatUrl,
  createRateLimiter,
  verifyAndDecodeJWT,
  verifyAPIResponse,
  formatAPIValidationError
} from "@nyckel/authentication";

import fetch from "node-fetch";

const managementTokenRateLimiter = createRateLimiter();

type ResponseTokenBody = {
  access_token: string;
  token_type: "Bearer";
};

function verifyTokenResponse(response: ResponseTokenBody) {
  if (response.access_token == null) {
    throw new Error(formatAPIValidationError("expected access_token to exist"));
  }
  if (response.token_type !== "Bearer") {
    throw new Error(
      formatAPIValidationError(
        "expected token_type to be 'Bearer', but got '" +
          response.token_type +
          "'"
      )
    );
  }
}

type FetchTokenResult = {
  accessToken: string;
  scope: Set<string>;
  expires: number;
};

const tokenId = "token";
export async function fetchManagementToken(
  config: GlobalAuthenticationConfig
): Promise<FetchTokenResult> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[nyckel] fetching management token from " + config.urls.token
    );
  }

  await managementTokenRateLimiter.wait(tokenId);
  const response = await fetch(config.urls.token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      audience: concatUrl(config.authorizationDomain, "/api/v2/")
    })
  });

  managementTokenRateLimiter.updateFromResponse(tokenId, response);

  if (response.status === 429) {
    return fetchManagementToken(config);
  }

  const body: any = await response.json();
  const verifiedBody = verifyAPIResponse<ResponseTokenBody>(
    response.status,
    body,
    config.urls.token
  );
  verifyTokenResponse(verifiedBody);

  const data = await verifyAndDecodeJWT(verifiedBody.access_token, config);

  return {
    accessToken: verifiedBody.access_token,
    expires: data.exp * 1000,
    scope: new Set(data.scope!.split(" "))
  };
}
