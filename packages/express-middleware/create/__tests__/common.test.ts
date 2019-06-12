import { createCommonMiddleware } from "../common";
import { getSafeHostname } from "@nyckel/authentication";
import {
  enhanceRequestWithSession,
  enhanceRequestWithUser
} from "@nyckel/http-middleware";

jest.mock("@nyckel/http-middleware", () => {
  const orig = jest.requireActual("@nyckel/http-middleware");
  return {
    ...orig,
    enhanceRequestWithSession: jest.fn(val => {
      val.session = true;
      return val;
    }),
    enhanceRequestWithUser: jest.fn(val => {
      val.user = true;
      return val;
    })
  };
});

jest.mock("@nyckel/authentication", () => {
  const orig = jest.requireActual("@nyckel/authentication");
  return {
    ...orig,
    getSafeHostname: jest.fn(() => "https://realhost.com:1234")
  };
});

const cookieName = "cookieName";

describe("createCallbackHandler", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns a function", () => {
    expect(typeof createCommonMiddleware({} as any)).toBe("function");
  });

  function prepareRequest(headers: any, secureCookies: boolean = false) {
    const sessionManager = { sessions: "yes" };
    const trustProxyFn = jest.fn(() => true);
    const handler = createCommonMiddleware({
      secureCookies,
      cookieName,
      trustProxyFn,
      sessionManager,
      authConfig: "authConfig",
      authManagementConfig: "authManagementConfig"
    } as any);

    const protocol = "https";

    const getHeader = jest.fn((name: string) => {
      return headers[name] || undefined;
    });
    const req = {
      protocol,
      get: getHeader,
      cookies: { [cookieName]: "cookie" }
    } as any;

    return { trustProxyFn, getHeader, handler, req, sessionManager };
  }

  describe("req.realHost", () => {
    it("is assigned to correctly", async () => {
      const headers = {
        "X-Forwarded-Host": "forwardedhost.com",
        Host: "realhost.com"
      };
      const { trustProxyFn, getHeader, handler, req } = prepareRequest(headers);

      const next = jest.fn();
      await handler(req, {} as any, next);

      expect(getHeader).toBeCalledWith("X-Forwarded-Host");
      expect(getHeader).toBeCalledWith("Host");

      expect(getSafeHostname).toBeCalledWith(
        "https",
        headers["X-Forwarded-Host"],
        headers["Host"],
        trustProxyFn
      );
      const val = (getSafeHostname as jest.Mock).mock.results[0];
      expect(val.type).toBe("return");
      expect(req.realHost).toBe(val.value);

      expect(next).toBeCalled();
      expect(next).toBeCalledWith();
    });
  });

  describe("enhanceRequestWithSession", () => {
    it("called correctly", async () => {
      const { handler, req, sessionManager } = prepareRequest({});

      const next = jest.fn();
      await handler(req as any, {} as any, next);

      const calls = (enhanceRequestWithSession as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);

      const [call] = calls;

      expect(call[0]).toBe(req);
      expect(call[1]).toBe(cookieName);
      expect(call[2]).toBe("cookie");
      expect(call[3]).toBe(sessionManager);
      expect(typeof call[4]).toBe("function");
      expect(typeof call[5]).toBe("function");

      expect(req.session).toBeDefined();
    });
    describe("clearCookie function", () => {
      it("passes name through", async () => {
        const { handler, req } = prepareRequest({});

        const next = jest.fn();
        const clearCookie = jest.fn();
        await handler(req as any, { clearCookie } as any, next);

        const fn = (enhanceRequestWithSession as jest.Mock).mock.calls[0][5];
        expect(typeof fn).toBe("function");

        fn("test");
        expect(clearCookie).toBeCalledWith("test");
      });
    });

    describe("setCookie function", () => {
      async function getFn(
        forwardedProto: string | undefined,
        secureCookies: boolean
      ) {
        const { handler, req } = prepareRequest(
          {
            "X-Forwarded-Proto": forwardedProto
          },
          secureCookies
        );

        const next = jest.fn();
        const setCookie = jest.fn();
        await handler(req as any, { cookie: setCookie } as any, next);

        const fn = (enhanceRequestWithSession as jest.Mock).mock.calls[0][4];
        expect(typeof fn).toBe("function");

        return { fn: fn as (name: string, value: string) => void, setCookie };
      }

      it("handles correctly without forwarded proto and insecure cookies", async () => {
        const { fn, setCookie } = await getFn(undefined, false);
        fn("n", "v");
        expect(setCookie).toBeCalledWith("n", "v", {
          httpOnly: true,
          maxAge: 15552000000,
          secure: false
        });
      });

      it("handles correctly without forwarded proto and secure cookies", async () => {
        const { fn, setCookie } = await getFn(undefined, true);
        fn("n", "v");
        expect(setCookie).toBeCalledWith("n", "v", {
          httpOnly: true,
          maxAge: 15552000000,
          secure: true
        });
      });

      it("handles correctly with forwarded proto (HTTP) and insecure cookies", async () => {
        const { fn, setCookie } = await getFn("http", false);
        fn("n", "v");
        expect(setCookie).toBeCalledWith("n", "v", {
          httpOnly: true,
          maxAge: 15552000000,
          secure: false
        });
      });

      it("handles correctly with forwarded proto (HTTP) and secure cookies", async () => {
        const { fn, setCookie } = await getFn("http", true);
        fn("n", "v");
        expect(setCookie).toBeCalledWith("n", "v", {
          httpOnly: true,
          maxAge: 15552000000,
          secure: true
        });
      });

      it("handles correctly with forwarded proto (HTTPS) and insecure cookies", async () => {
        const { fn, setCookie } = await getFn("https", false);
        fn("n", "v");
        expect(setCookie).toBeCalledWith("n", "v", {
          httpOnly: true,
          maxAge: 15552000000,
          secure: true
        });
      });

      it("handles correctly with forwarded proto (HTTPS) and secure cookies", async () => {
        const { fn, setCookie } = await getFn("https", true);
        fn("n", "v");
        expect(setCookie).toBeCalledWith("n", "v", {
          httpOnly: true,
          maxAge: 15552000000,
          secure: true
        });
      });
    });
  });

  describe("enhanceRequestWithUser", () => {
    it("called correctly", async () => {
      const { handler, req, sessionManager } = prepareRequest({});

      const next = jest.fn();
      await handler(req as any, {} as any, next);

      const calls = (enhanceRequestWithUser as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);

      const [call] = calls;

      expect(call[0]).toBe(req);
      expect(call[1]).toBe(cookieName);
      expect(call[2]).toBe("cookie");
      expect(call[3]).toBe(sessionManager);
      expect(call[4]).toBe("authConfig");
      expect(call[5]).toBe("authManagementConfig");

      expect(req.user).toBeDefined();
    });
  });
});
