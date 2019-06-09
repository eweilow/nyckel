import { GlobalAuthenticationConfig } from "../utils/globalConfig";
import fetch from "node-fetch";

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
      `Expected decoded.${property} to be type ${typeOf}, but got${typeof decoded[
        property
      ]}`
    );
  }
}

export async function getUserInfo(
  accessToken: string,
  config: GlobalAuthenticationConfig
): Promise<UserInfo> {
  const response = await fetch(config.urls.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const limit = parseInt(response.headers.get("x-ratelimit-limit")!, 10);
  const remaining = parseInt(
    response.headers.get("x-ratelimit-remaining")!,
    10
  );
  const used = limit - remaining;
  const resetTime =
    parseInt(response.headers.get("x-ratelimit-reset")!, 10) * 1000;
  const resetsIn = resetTime - Date.now();
  const untilNextRefresh = resetsIn / used;

  console.log({
    response,
    limit,
    remaining,
    used,
    reset: Math.floor(resetTime / 1000),
    now: Math.floor(Date.now() / 1000),
    resetsIn: Math.floor(resetsIn / 1000),
    untilNextRefresh: Math.floor(untilNextRefresh / 1000)
  });

  const body = await response.json();

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

  console.log(user);

  check(user, "sub", "string");
  check(user, "name", "string");
  check(user, "nickname", "string");
  check(user, "picture", "string");
  check(user, "email", "string");
  check(user, "emailVerified", "boolean");
  check(user, "updatedAt");

  return body;
}
