import express from "express";
import cookieParser from "cookie-parser";

import { createGlobalAuthenticationConfig } from "@nyckel/authentication";

import { createSessionManager } from "@nyckel/sessions";

import {
  nyckelExpressMiddleware,
  asyncHandler
} from "@nyckel/express-middleware";

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

const sessionManager = createSessionManager(
  process.env.REDIS_URL!,
  err => console.error(err),
  {
    salt: process.env.SESSION_SALT!,
    secret: process.env.SESSION_SECRET!,
    ttl: 7 * 24 * 60 * 60
  }
);

const authMiddleware = nyckelExpressMiddleware({
  cookieName: process.env.COOKIE_NAME!,
  secureCookies: false,
  sessionManager,
  trustProxyFn: app.get("trust proxy fn"),
  authConfig,
  authManagementConfig
});

app.use(authMiddleware);

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
      const [userInfo, fullUserData, roles, permissions] = await Promise.all([
        req.user.userInfo(),
        req.user.fullUserData(),
        req.user.roles(),
        req.user.permissions()
      ]);
      res.write("<p>" + (Date.now() - t) + "</p>");

      res.write("<pre>" + JSON.stringify(userInfo, null, "  ") + "</pre>");
      res.write("<pre>" + JSON.stringify(fullUserData, null, "  ") + "</pre>");
      res.write("<pre>" + JSON.stringify(roles, null, "  ") + "</pre>");
      res.write("<pre>" + JSON.stringify(permissions, null, "  ") + "</pre>");
    }
    res.end();
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
      res.write("<pre>");
      res.write(JSON.stringify(await req.user.fullUserData(), null, "  "));
      res.write("</pre>");
    }
    res.end();
  })
);

app.listen(8080);
