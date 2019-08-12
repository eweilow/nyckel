import { GlobalAuthenticationConfig } from "../utils/globalConfig";
import fetch from "node-fetch";
import { createRateLimiter } from "../utils/rateLimiter";
import { decodeJWT } from "../jwt/decode";
import { verifyAPIResponse } from "../utils/validateResponse";

export type UserInfo = {
  sub: string;
  name: string;
  nickname: string;
  picture: string;
  locale?: string;
  email: string;
  emailVerified: boolean;
  updatedAt: Date;
};

function check(decoded: any, property: string, typeOf?: string) {
  if (decoded[property] == null) {
    throw new Error(`Expected decoded userinfo to have property '${property}'`);
  }
  if (typeOf != null && typeof decoded[property] !== typeOf) {
    throw new Error(
      `Expected decoded.${property} to be type ${typeOf}, but got ${typeof decoded[
        property
      ]}`
    );
  }
}

const userInfoRateLimiter = createRateLimiter();

export async function getUserInfo(
  accessToken: string,
  config: GlobalAuthenticationConfig
): Promise<UserInfo> {
  const { sub } = decodeJWT(accessToken);

  await userInfoRateLimiter.wait(sub!);

  if (process.env.NODE_ENV !== "production") {
    console.info("[nyckel] requesting userinfo at " + config.urls.userinfo);
  }

  const response = await fetch(config.urls.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  userInfoRateLimiter.updateFromResponse(sub!, response);

  if (response.status === 429) {
    return getUserInfo(accessToken, config);
  }

  const json = await response.json();
  const body = verifyAPIResponse(response.status, json, config.urls.userinfo);

  check(body, "sub", "string");
  check(body, "name", "string");
  check(body, "nickname", "string");
  check(body, "picture", "string");
  check(body, "email", "string");
  check(body, "email_verified", "boolean");
  check(body, "updated_at", "string");

  const user: UserInfo = {
    sub: body.sub,
    name: body.name,
    nickname: body.nickname,
    picture: body.picture,
    locale: body.locale,
    email: body.email,
    emailVerified: body.email_verified,
    updatedAt: new Date(body.updated_at)
  };

  return user;
}
