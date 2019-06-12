import {
  nyckelExpressMiddleware,
  NyckelExpressMiddlewareOptions
} from "../middleware";
import { RequestHandler } from "express";
import express from "express";
import supertest from "supertest";
import { createCommonMiddleware } from "../create/common";
import { createLogoutHandler } from "../create/authLogout";
import { createLoggedOutHandler } from "../create/authLoggedout";
import { createCallbackHandler } from "../create/authCallback";
import { createLoginHandler } from "../create/authLogin";

function mockFactory(name: string) {
  return () => {
    return {
      [name]: jest.fn(() => {
        const handler: RequestHandler = (req, res) => {
          res.end(name);
        };
        return handler;
      })
    };
  };
}
jest.mock("../create/common", () => {
  return {
    createCommonMiddleware: jest.fn(() => {
      const handler: RequestHandler = (req, res, next) => {
        res.write("createCommonMiddleware:");
        next();
      };
      return handler;
    })
  };
});
jest.mock("../create/authLogin", mockFactory("createLoginHandler"));
jest.mock("../create/authCallback", mockFactory("createCallbackHandler"));
jest.mock("../create/authLoggedout", mockFactory("createLoggedOutHandler"));
jest.mock("../create/authLogout", mockFactory("createLogoutHandler"));

describe("nyckelExpressMiddleware", () => {
  it("should create a correct router", async () => {
    const opts = {} as NyckelExpressMiddlewareOptions;
    const app = express();
    app.use(nyckelExpressMiddleware(opts));
    const server = supertest(app);

    expect((await server.get("/auth/login")).text).toBe(
      "createCommonMiddleware:createLoginHandler"
    );
    expect((await server.get("/auth/callback")).text).toBe(
      "createCommonMiddleware:createCallbackHandler"
    );
    expect((await server.get("/auth/loggedout")).text).toBe(
      "createCommonMiddleware:createLoggedOutHandler"
    );
    expect((await server.get("/auth/logout")).text).toBe(
      "createCommonMiddleware:createLogoutHandler"
    );

    expect(createCommonMiddleware).toBeCalledWith(opts);
    expect(createLoginHandler).toBeCalledWith(opts);
    expect(createCallbackHandler).toBeCalledWith(opts);
    expect(createLoggedOutHandler).toBeCalledWith(opts);
    expect(createLogoutHandler).toBeCalledWith(opts);
  });

  it("returns the correct router stack", () => {
    const opts = {} as NyckelExpressMiddlewareOptions;
    const router = nyckelExpressMiddleware(opts);

    expect(
      router.stack.map(item => ({
        path: item.route ? item.route.path : null,
        regexp: item.regexp
      }))
    ).toMatchSnapshot();
  });
});
