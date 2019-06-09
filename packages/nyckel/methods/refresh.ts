import { GlobalAuthenticationConfig } from "..";
import { verifyAndDecodeJWT, DecodedJWT } from "../jwt/verify";
import fetch from "node-fetch";

type RequestTokenBody = ValidResponseTokenBody | ErrorResponseTokenBody;

type ValidResponseTokenBody = {
  access_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
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
  if (response.id_token == null) {
    throw new Error("Expected access_token to exist");
  }
  if (response.expires_in == null) {
    throw new Error("Expected expires_in to exist");
  }

  return true;
}

export type ErrorResponseTokenBody = {
  error: string;
  error_description: string;
};

export async function attemptToRefreshToken(
  session: {
    refreshToken: string;
    expires: number;
  },
  config: GlobalAuthenticationConfig
): Promise<{
  accessToken: string;
  idToken: string;
  expires: number;
}> {
  const response = await fetch(config.urls.token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: session.refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(
      "User info fetch resulted in: " +
        response.status +
        " " +
        response.statusText
    );
  }

  const body: RequestTokenBody = await response.json();

  if (!verifyTokenResponse(body)) {
    throw new Error("Unable to verify token response");
  }

  let decodedIdToken!: DecodedJWT;
  let decodedAccessToken: DecodedJWT | null = null;
  let expiresUtcSeconds = Number.MAX_VALUE;
  try {
    decodedIdToken = await verifyAndDecodeJWT(body.id_token, config);
    if (decodedIdToken.exp < expiresUtcSeconds) {
      expiresUtcSeconds = decodedIdToken.exp;
    }
  } catch (idTokenError) {
    idTokenError.message += " (id token)";
    throw idTokenError;
  }
  if (config.audience !== config.urls.userinfo) {
    try {
      decodedAccessToken = await verifyAndDecodeJWT(body.access_token, config);
      if (decodedAccessToken.exp < expiresUtcSeconds) {
        expiresUtcSeconds = decodedAccessToken.exp;
      }
    } catch (accessTokenError) {
      accessTokenError.message += " (access token)";
      throw accessTokenError;
    }
  }

  const expiresUtcMilliseconds = expiresUtcSeconds * 1000;
  return {
    accessToken: body.access_token,
    idToken: body.id_token,
    expires: expiresUtcMilliseconds
  };
}
