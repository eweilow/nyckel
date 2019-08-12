import { GlobalAuthenticationConfig } from "../utils/globalConfig";
import fetch from "node-fetch";
import { verifyAndDecodeJWT, DecodedAccessToken } from "../jwt/verify";
import { verifyAPIResponse } from "../utils/validateResponse";
import { formatAPIValidationError } from "../utils/formatError";

type RequestTokenBody = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
};

function verifyTokenResponse(response: RequestTokenBody) {
  if (response.access_token == null) {
    throw new Error(formatAPIValidationError("expected access_token to exist"));
  }
  if (response.id_token == null) {
    throw new Error(formatAPIValidationError("expected id_token to exist"));
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
  if (response.expires_in == null) {
    throw new Error(formatAPIValidationError("expected expires_in to exist"));
  }
  if (response.refresh_token == null) {
    throw new Error(
      formatAPIValidationError("expected refresh_token to exist")
    );
  }
}

export async function requestToken(
  code: string,
  redirectUrl: string,
  config: GlobalAuthenticationConfig
) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test"
  ) {
    console.info("[Nyckel] requesting a token at " + config.urls.token);
  }

  const response = await fetch(config.urls.token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUrl
    })
  });

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
    // if configurated audience matches the Auth0 userinfo scope, the access token will not be a JWT
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
    refreshToken: verifiedBody.refresh_token,
    accessToken: verifiedBody.access_token,
    idToken: verifiedBody.id_token,
    expires: expiresUtcMilliseconds
  };
}
