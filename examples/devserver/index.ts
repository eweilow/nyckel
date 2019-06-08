import express from "express";
import cookieParser from "cookie-parser";

import {
  createGlobalAuthenticationConfig,
  authorizeUser,
  requestToken,
  verifyCSRFPair,
  logoutUser,
  concatUrl,
  getSafeHostname
} from "@eweilow/nyckel";

import { createSessionManager } from "@eweilow/nyckel-sessions";
import { getUserInfo } from "@eweilow/nyckel";

require("dotenv").config();

const app = express();
app.use(cookieParser());

const authConfig = createGlobalAuthenticationConfig(
  process.env.AUTH0_CLIENT_ID!,
  process.env.AUTH0_CLIENT_SECRET!,
  process.env.AUTH0_DOMAIN!,
  process.env.AUTH0_AUDIENCE!
);

const sessions = createSessionManager(process.env.REDIS_URL!, err => {}, {
  salt: process.env.SESSION_SALT!,
  secret: process.env.SESSION_SECRET!,
  ttl: 7 * 24 * 60 * 60
});

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
    }
    export interface Response {
      session: {
        delete(): Promise<any>;
        get(): Promise<any>;
        set(data: any): Promise<void>;
      };
    }
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

  res.session = {
    async set(data) {
      let id = cookie;
      if (!id) {
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
      if (!!cookie) {
        const value = await sessions.get(cookie);
        if (value) {
          return value;
        }
      }
      return {};
    },
    async delete() {
      if (!!cookie) {
        await sessions.delete(cookie);
        res.clearCookie(cookieName);
      }
    }
  };
  next();
});

app.get(
  "/auth/login",
  asyncHandler(async (req, res, next) => {
    const { csrfPair, redirectTo } = await authorizeUser(
      [],
      concatUrl(req.realHost, "/auth/callback"),
      authConfig
    );

    await res.session.set({
      csrfSecret: csrfPair.secret
    });

    res.redirect(redirectTo);
  })
);

app.get(
  "/auth/logout",
  asyncHandler(async (req, res, next) => {
    const { redirectTo } = await logoutUser(
      concatUrl(req.realHost, "/auth/loggedout"),
      authConfig
    );

    res.redirect(redirectTo);
  })
);

app.get(
  "/auth/loggedout",
  asyncHandler(async (req, res, next) => {
    await res.session.delete();
    res.redirect("/");
  })
);

app.get(
  "/auth/callback",
  asyncHandler(async (req, res, next) => {
    const session = await res.session.get();
    console.log(session);

    try {
      const { csrfSecret } = session;
      await verifyCSRFPair({
        secret: csrfSecret,
        token: req.query.state
      });
    } catch (err) {
      await res.session.delete();
      throw err;
    }

    const data = await requestToken(
      req.query.code,
      concatUrl(req.realHost, "/auth/callback"),
      authConfig
    );
    await res.session.set(data);
    res.redirect("/");
  })
);

app.get(
  "/",
  asyncHandler(async (req, res, next) => {
    const data = await res.session.get();
    res.write("<a href='/auth/login'>log in</a>");
    res.write("<br>");
    res.write("<a href='/auth/logout'>log out</a>");
    if (data) {
      res.write("<pre>");
      res.write(JSON.stringify(data, null, "  "));
      res.write("</pre>");
    }
    if (data.accessToken) {
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
