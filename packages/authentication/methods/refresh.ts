import { GlobalAuthenticationConfig } from "..";
import { verifyAndDecodeJWT, DecodedAccessToken } from "../jwt/verify";
import fetch from "node-fetch";
import { verifyAPIResponse } from "../utils/validateResponse";
import { formatAPIValidationError } from "../utils/formatError";
import { createRateLimiter } from "../utils/rateLimiter";

type RequestTokenBody = {
  access_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
};

function verifyTokenResponse(response: RequestTokenBody) {
  if (response.access_token == null) {
    throw new Error(formatAPIValidationError("expected access_token to exist"));
  }
  if (response.id_token == null) {
    throw new Error(formatAPIValidationError("expected access_token to exist"));
  }
  if (response.expires_in == null) {
    throw new Error(formatAPIValidationError("expected expires_in to exist"));
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

const refreshRateLimiter = createRateLimiter();

export async function attemptToRefreshToken(
  session: {
    refreshToken: string;
  },
  config: GlobalAuthenticationConfig
): Promise<{
  accessToken: string;
  idToken: string;
  expires: number;
}> {
  await refreshRateLimiter.wait(session.refreshToken);

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test"
  ) {
    console.info("[Nyckel] refreshing a token at " + config.urls.token);
  }

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

  refreshRateLimiter.updateFromResponse(session.refreshToken, response);

  if (response.status === 429) {
    return attemptToRefreshToken(session, config);
  }

  const json = await response.json();
  const verifiedBody = verifyAPIResponse(
    response.status,
    json,
    config.urls.token
  );

  verifyTokenResponse(verifiedBody);

  let decodedIdToken!: DecodedAccessToken;
  let decodedAccessToken: DecodedAccessToken | null = null;
  let expiresUtcSeconds = Number.MAX_VALUE;
  try {
    decodedIdToken = await verifyAndDecodeJWT(verifiedBody.id_token, config);
    expiresUtcSeconds = decodedIdToken.exp;
  } catch (idTokenError) {
    idTokenError.message += " (id token)";
    throw idTokenError;
  }
  if (config.audience !== config.urls.userinfo) {
    try {
      decodedAccessToken = await verifyAndDecodeJWT(
        verifiedBody.access_token,
        config
      );
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
    accessToken: verifiedBody.access_token,
    idToken: verifiedBody.id_token,
    expires: expiresUtcMilliseconds
  };
}
