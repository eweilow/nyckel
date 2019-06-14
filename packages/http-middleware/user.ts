import {
  attemptToRefreshToken,
  GlobalAuthenticationConfig,
  getUserInfo,
  decodeJWT,
  DecodedAccessToken
} from "@nyckel/authentication";
import { SessionManager } from "@nyckel/sessions";
import {
  getManagementUserInfo,
  getManagementUserRoles,
  getManagementUserPermissions
} from "@nyckel/management";

import { SessionInRequest } from "./session";
import { DecodedIdToken } from "@nyckel/authentication/jwt/verify";

export type UserInRequest = {
  get(): Promise<
    | ({
        accessTokenData: DecodedAccessToken;
        idTokenData: DecodedIdToken;
        accessToken: string;
        idToken: string;
        expiresIn: number;
      })
    | null
  >;
  userInfo(): Promise<any>;
  fullUserData(): Promise<any>;
  roles(): Promise<any>;
  permissions(): Promise<any>;
};

function isExpired(
  expires: number,
  now: number = Date.now(),
  margin: number = 10 * 60 * 1000 // Refreshing 10 minutes before token expires give ample time for multiple retries
) {
  return now >= expires - margin;
}

export { isExpired as isTokenExpired };

export function enhanceRequestWithUser<T extends { session: SessionInRequest }>(
  request: T,
  cookieName: string,
  cookie: string,
  sessions: SessionManager,
  authConfig: GlobalAuthenticationConfig,
  authManagementConfig: GlobalAuthenticationConfig,
  expirationMargin: number = 10 * 60 * 1000
): T & { user: UserInRequest } {
  let enhancedRequest = request as T & { user: UserInRequest };

  enhancedRequest.user = {
    async get() {
      const id = cookie;
      if (!sessions.isValidId(id)) {
        return null;
      }

      let session = await enhancedRequest.session.get();
      if (session == null) {
        return null;
      }
      if (session.accessToken == null) {
        return null;
      }

      if (isExpired(session.expires, Date.now(), expirationMargin)) {
        const lock = await sessions.lock(id, 5000);
        if (lock.acquired) {
          try {
            const refreshed = await attemptToRefreshToken(session, authConfig);
            session = {
              ...session,
              ...refreshed
            };
            await sessions.set(id, session);
          } finally {
            await lock.release();
          }
        }
      }

      return {
        idTokenData: decodeJWT(session.idToken),
        accessTokenData: decodeJWT(session.accessToken),
        accessToken: session.accessToken,
        idToken: session.idToken,
        expiresIn: session.expires - Date.now()
      };
    },
    async userInfo() {
      const user = await enhancedRequest.user.get();
      if (user == null) {
        return null;
      }
      return getUserInfo(user.accessToken, authConfig);
    },
    async fullUserData() {
      const user = await enhancedRequest.user.get();
      if (user == null) {
        return null;
      }
      return getManagementUserInfo(user.idTokenData.sub!, authManagementConfig);
    },
    async roles() {
      const user = await enhancedRequest.user.get();
      if (user == null) {
        return null;
      }
      return getManagementUserRoles(
        user.idTokenData.sub!,
        authManagementConfig
      );
    },
    async permissions() {
      const user = await enhancedRequest.user.get();
      if (user == null) {
        return null;
      }
      return getManagementUserPermissions(
        user.idTokenData.sub!,
        authManagementConfig
      );
    }
  };

  return enhancedRequest;
}
