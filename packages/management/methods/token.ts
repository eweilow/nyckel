import {
  GlobalAuthenticationConfig,
  concatUrl,
  createRateLimiter
} from "@nyckel/authentication";

import fetch from "node-fetch";
import { verifyAndDecodeJWT } from "@nyckel/authentication";

const managementTokenRateLimiter = createRateLimiter();

type RequestTokenBody = ValidResponseTokenBody | ErrorResponseTokenBody;

type ValidResponseTokenBody = {
  access_token: string;
  token_type: "Bearer";
};

type ErrorResponseTokenBody = {
  error: string;
  error_description: string;
};

function verifyTokenResponse(
  response: RequestTokenBody
): response is ValidResponseTokenBody {
  if ("error" in response) {
    throw new Error(response.error + ": " + response.error_description);
  }
  if (response.access_token == null) {
    throw new Error("Expected access_token to exist");
  }
  return true;
}

type FetchTokenResult = {
  accessToken: string;
  scope: Set<string>;
  expires: number;
};

const tokenId = "token";
async function fetchManagementToken(
  config: GlobalAuthenticationConfig
): Promise<FetchTokenResult> {
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

  const body: RequestTokenBody = await response.json();

  if (!verifyTokenResponse(body)) {
    throw new Error("Unable to verify token response");
  }

  const data = await verifyAndDecodeJWT(body.access_token, config);

  return {
    accessToken: body.access_token,
    expires: data.exp * 1000,
    scope: new Set(data.scope!.split(" "))
  };
}

let cachedResult: FetchTokenResult | null = null;
let currentlyFetching: Promise<FetchTokenResult> | null = null;

export async function getManagementToken(
  config: GlobalAuthenticationConfig
): Promise<string> {
  if (cachedResult == null) {
    if (currentlyFetching == null) {
      currentlyFetching = fetchManagementToken(config);
      cachedResult = await currentlyFetching;
      currentlyFetching = null;
      return cachedResult.accessToken;
    } else {
      const fetched = await currentlyFetching;
      return fetched.accessToken;
    }
  }

  if (cachedResult.expires > Date.now() + 60000) {
    return cachedResult.accessToken;
  } else {
    cachedResult = null;
    return getManagementToken(config);
  }
}
