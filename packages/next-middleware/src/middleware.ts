import {
  getSafeHostname,
  createGlobalAuthenticationConfig
} from "@nyckel/authentication";
import { createSessionManager } from "@nyckel/sessions";

import {
  enhanceRequestWithSession,
  enhanceRequestWithUser,
  SessionInRequest,
  UserInRequest
} from "@nyckel/http-middleware";

import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import { TLSSocket } from "tls";

import { parse as parseCookies, serialize } from "cookie";
import { AuthConfig } from "./config";

function singleHeaderValue(val?: string | string[]) {
  if (!val) {
    return null;
  }
  if (Array.isArray(val)) {
    val = val.join(", ");
  }

  const commaIndex = val.indexOf(",");
  if (commaIndex >= 0) {
    return val.slice(0, commaIndex).trim();
  }
  return val.trim();
}

function getProtocol(req: IncomingMessage, isTrusted: (ip?: string) => boolean) {
  const socket = req.socket as Socket | TLSSocket;
  const encrypted = "encrypted" in socket ? socket.encrypted : false;

  const protocol = encrypted ? "https" : "http";
  if (!isTrusted(req.socket.remoteAddress)) {
    return { protocol, proxyProtocol: null };
  }

  return {
    protocol,
    proxyProtocol: singleHeaderValue(req.headers["X-Forwarded-Proto"])
  };
}

let singleton: ReturnType<typeof createAuthSingletons> | null;

function createAuthSingletons(config: AuthConfig) {
  const authConfig = createGlobalAuthenticationConfig(
    config.auth0ClientId,
    config.auth0ClientSecret,
    config.auth0ClientDomain,
    config.auth0ClientAudience
  );

  const authManagementConfig = createGlobalAuthenticationConfig(
    config.auth0ManagementClientId,
    config.auth0ManagementClientSecret,
    config.auth0ClientDomain,
    config.auth0ClientAudience
  );

  const sessionManager = createSessionManager(
    process.env.REDIS_URL!,
    err => console.error(err),
    {
      salt: config.sessionSalt,
      secret: config.sessionSecret,
      ttl: 7 * 24 * 60 * 60
    }
  );

  return {
    authConfig,
    authManagementConfig,
    sessionManager
  };
}

function getAuthSingletons(config: AuthConfig) {
  if (singleton == null) {
    singleton = createAuthSingletons(config);
  }

  return singleton;
}

type InferPromise<T> = T extends Promise<infer U> ? U : never;
export type AuthState = InferPromise<ReturnType<typeof handleAuth>>;

export async function handleAuth(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
) {
  const trustProxyFn = config.trustProxyFn ??( (ip?: string) => ip === "127.0.0.1");
  const cookieName = config.cookieName;

  const { protocol, proxyProtocol } = getProtocol(req, trustProxyFn);
  const actualProtocol = proxyProtocol ?? protocol;

  const hostAtProxy = singleHeaderValue(req.headers["X-Forwarded-Host"]);
  const realHost = getSafeHostname(
    actualProtocol,
    // req.url.,
    hostAtProxy ?? undefined,
    req.headers.host,
    req.connection.remoteAddress,
    trustProxyFn
  );

  const cookies = parseCookies(req.headers.cookie ?? "");
  const cookie = cookies[cookieName] ?? null;

  const {
    authConfig,
    authManagementConfig,
    sessionManager
  } = getAuthSingletons(config);

  enhanceRequestWithSession(
    req,
    cookieName,
    cookie,
    sessionManager,
    (name, value) => {
      res.setHeader(
        "set-cookie",
        serialize(name, value, {
          path: "/",
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 180,
          secure: actualProtocol === "https"
        })
      );
    },
    name => {
      res.setHeader(
        "set-cookie",
        serialize(name, "", {
          path: "/",
          httpOnly: true,
          expires: new Date(0),
          secure: actualProtocol === "https"
        })
      );
    }
  );
  const session = (req as any).session as SessionInRequest;

  enhanceRequestWithUser(
    req as any,
    cookieName,
    cookie,
    sessionManager,
    authConfig,
    authManagementConfig,
    10 * 60 * 1000
  );
  const user = (req as any).user as UserInRequest;

  const userData = cookie == null ? null : await user.get();

  const retVal = {
    config: authConfig,
    host: {
      actual: realHost,
      header: req.headers.host,
      atProxy: hostAtProxy
    },
    protocol: {
      actual: actualProtocol,
      request: protocol,
      atProxy: proxyProtocol
    },
    cookie,
    session,
    user: {
      ...user,
      data:
        userData != null
          ? {
              nickname: userData.idTokenData.nickname,
              picture: userData.idTokenData.picture,
              email: userData.idTokenData.email,
              name: userData.idTokenData.name,
              sub: userData.idTokenData.sub,
              age: Math.floor(
                (Date.now() -
                  +new Date((userData.idTokenData as any).updated_at)) /
                  1000
              ),
              expiresIn: Math.floor(
                (userData.idTokenData.exp * 1000 - Date.now()) / 1000
              ),
              permissions: (userData.accessTokenData as any).permissions ?? []
            }
          : null
    },
    hasPermissions(...permissions: string[]) {
      return hasPermissions(
        res,
        retVal.user.data?.permissions ?? [],
        ...permissions
      );
    }
  };

  return retVal;
}

function hasPermissions(
  res: any,
  userPermissions: string[],
  ...wantedPermissions: string[]
) {
  const missingPermissions = wantedPermissions.filter(wantedPermission => {
    return userPermissions.indexOf(wantedPermission) < 0;
  });
  return missingPermissions;
}
