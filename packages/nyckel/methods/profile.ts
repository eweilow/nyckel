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

  check(user, "sub", "string");
  check(user, "name", "string");
  check(user, "nickname", "string");
  check(user, "picture", "string");
  check(user, "email", "string");
  check(user, "emailVerified", "boolean");
  check(user, "updatedAt");

  return body;
}
