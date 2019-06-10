import express from "express";
import cookieParser from "cookie-parser";

import {
  createGlobalAuthenticationConfig,
  authorizeUser,
  requestToken,
  verifyCSRFPair,
  logoutUser,
  concatUrl,
  getSafeHostname,
  attemptToRefreshToken,
  getUserInfo,
  UserInfo,
  decodeJWT
} from "@nyckel/authentication";

import {
  getManagementToken,
  getManagementUserInfo,
  getManagementUserRoles,
  getManagementUserPermissions
} from "@nyckel/management";
import { createSessionManager } from "@nyckel/sessions";
import { DecodedJWT } from "@nyckel/authentication/jwt/verify";

require("dotenv").config();

const app = express();
app.use(cookieParser());

const authConfig = createGlobalAuthenticationConfig(
  process.env.AUTH0_CLIENT_ID!,
  process.env.AUTH0_CLIENT_SECRET!,
  process.env.AUTH0_DOMAIN!,
  process.env.AUTH0_AUDIENCE!
);

const authManagementConfig = createGlobalAuthenticationConfig(
  process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
  process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
  process.env.AUTH0_DOMAIN!,
  process.env.AUTH0_AUDIENCE!
);

const sessions = createSessionManager(
  process.env.REDIS_URL!,
  err => console.error(err),
  {
    salt: process.env.SESSION_SALT!,
    secret: process.env.SESSION_SECRET!,
    ttl: 7 * 24 * 60 * 60
  }
);

function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: () => void
  ) => Promise<void>
) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    handler(req, res, next).catch(err => next(err));
  };
}

declare global {
  namespace Express {
    export interface Request {
      realHost: string;
      session: {
        delete(): Promise<any>;
        get(): Promise<any>;
        set(data: any): Promise<void>;
      };
      user: {
        get(): Promise<
          | ({
              accessTokenData: DecodedJWT;
              idTokenData: DecodedJWT;
              accessToken: string;
              idToken: string;
              expiresIn: number;
            })
          | null
        >;
      };
    }
    export interface Response {}
  }
}

const secureCookies = false;

app.use((req, res, next) => {
  req.realHost = getSafeHostname(
    req.protocol,
    req.get("X-Forwarded-Host"),
    req.get("Host"),
    app.get("trust proxy fn")
  );

  const cookieName = process.env.COOKIE_NAME!;
  const cookie = req.cookies[cookieName];

  req.session = {
    async set(data) {
      let id = cookie;
      if (!sessions.isValidId(id)) {
        id = sessions.generateId();
      }
      res.cookie(cookieName, id, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 180,
        secure: secureCookies || res.get("X-Forwarded-Proto") === "https"
      });
      await sessions.set(id, data);
    },
    async get() {
      const id = cookie;
      if (sessions.isValidId(id)) {
        const value = await sessions.get(id);
        if (value) {
          return value;
        }
      }
      return {};
    },
    async delete() {
      const id = cookie;
      if (sessions.isValidId(id)) {
        await sessions.delete(id);
        res.clearCookie(cookieName);
      }
    }
  };

  req.user = {
    async get() {
      const id = cookie;
      if (!sessions.isValidId(id)) {
        return null;
      }

      let session = await req.session.get();
      if (session == null) {
        return null;
      }

      if (session.accessToken == null) {
        return null;
      }

      function isExpired(expires: number) {
        return Date.now() > expires - 10 * 60 * 1000; // Refreshing 10 minutes before token expires give ample time for multiple retries
      }

      if (isExpired(session.expires)) {
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
    }
  };
  next();
});

app.get(
  "/management",
  asyncHandler(async (req, res) => {
    const user = await req.user.get();
    if (user == null) {
      res.write("<p>not logged in</p><br>");
      res.write("<a href='/auth/login'>log in</a>");
    } else {
      res.write("<pre>" + JSON.stringify(user, null, "  ") + "</pre>");

      let t = Date.now();
      res.write(
        "<pre>" +
          JSON.stringify(
            await getManagementUserInfo(
              user.idTokenData.sub!,
              authManagementConfig
            ),
            null,
            "  "
          ) +
          "</pre>"
      );
      res.write("<p>" + (Date.now() - t) + "</p>");
      t = Date.now();
      res.write(
        "<pre>" +
          JSON.stringify(
            await getManagementUserRoles(
              user.idTokenData.sub!,
              authManagementConfig
            ),
            null,
            "  "
          ) +
          "</pre>"
      );
      res.write("<p>" + (Date.now() - t) + "</p>");
      t = Date.now();
      res.write(
        "<pre>" +
          JSON.stringify(
            await getManagementUserPermissions(
              user.idTokenData.sub!,
              authManagementConfig
            ),
            null,
            "  "
          ) +
          "</pre>"
      );
      res.write("<p>" + (Date.now() - t) + "</p>");
    }
    res.end();
  })
);

app.get(
  "/auth/login",
  asyncHandler(async (req, res) => {
    if (await req.user.get()) {
      // Do nothing if user is already logged in
      res.redirect("/");
      return;
    }

    const { csrfPair, redirectTo } = await authorizeUser(
      [],
      concatUrl(req.realHost, "/auth/callback"),
      authConfig
    );

    await req.session.set({
      csrfSecret: csrfPair.secret
    });

    res.redirect(redirectTo);
  })
);

app.get(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const { redirectTo } = await logoutUser(
      concatUrl(req.realHost, "/auth/loggedout"),
      authConfig
    );

    res.redirect(redirectTo);
  })
);

app.get(
  "/auth/loggedout",
  asyncHandler(async (req, res) => {
    await req.session.delete();
    res.redirect("/");
  })
);

app.get(
  "/auth/callback",
  asyncHandler(async (req, res) => {
    if (!req.query.state) {
      throw new Error("Expected query to contain state!");
    }
    if (!req.query.code) {
      throw new Error("Expected query to contain code!");
    }

    const session = await req.session.get();

    try {
      const { csrfSecret } = session;
      await verifyCSRFPair({
        secret: csrfSecret,
        token: req.query.state
      });
    } catch (err) {
      await req.session.delete();
      throw err;
    }

    const data = await requestToken(
      req.query.code,
      concatUrl(req.realHost, "/auth/callback"),
      authConfig
    );
    await req.session.set(data);
    res.redirect("/");
  })
);

app.get(
  "/",
  asyncHandler(async (req, res, next) => {
    res.write("<a href='/info'>info</a><br>");

    const user = await req.user.get();
    if (user != null) {
      res.write("<p>" + Math.floor(user.expiresIn / 1000) + "</p>");
      res.write("<a href='/auth/logout'>log out</a>");
      res.write("<pre>");
      res.write(JSON.stringify(user, null, "  "));
      res.write("</pre>");
    } else {
      res.write("<a href='/auth/login'>log in</a>");
    }
    res.end();
  })
);

app.get(
  "/info",
  asyncHandler(async (req, res, next) => {
    res.write("<a href='/'>home</a><br>");
    const data = await req.session.get();
    if (data.accessToken) {
      res.write("<a href='/auth/logout'>log out</a>");
    } else {
      res.write("<a href='/auth/login'>log in</a>");
    }
    if (data) {
      res.write("<pre>");
      res.write(JSON.stringify(data, null, "  "));
      res.write("</pre>");
    }
    if (data.accessToken) {
      // TODO: Refresh the token
      // TODO: Provider 'user' on req
      res.write(
        "<p>" + Math.floor((data.expires - Date.now()) / 1000) + "</p>"
      );
      const userInfo = await getUserInfo(data.accessToken, authConfig);
      res.write("<pre>");
      res.write(JSON.stringify(userInfo, null, "  "));
      res.write("</pre>");
    }
    res.end();
  })
);

app.listen(8080);
