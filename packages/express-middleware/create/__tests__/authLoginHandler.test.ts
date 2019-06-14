import { createLoginHandler } from "../authLogin";
import { authorizeUser } from "@nyckel/authentication";

const redirectTo = "https://example.com/redirect/to";
jest.mock("@nyckel/authentication", () => {
  const orig = jest.requireActual("@nyckel/authentication");
  return {
    ...orig,
    authorizeUser: jest.fn(async () => {
      return {
        csrfPair: {
          secret: "secret",
          token: "token"
        },
        redirectTo
      };
    })
  };
});

describe("createLoginHandler", () => {
  it("returns a function", () => {
    expect(typeof createLoginHandler({} as any)).toBe("function");
  });

  it("redirects to / if user already is logged in", async () => {
    const handler = createLoginHandler({} as any);

    const next = jest.fn();
    const getUser = jest.fn(() => ({}));
    const redirect = jest.fn();
    await handler(
      {
        realHost: "http://example.com",
        user: {
          get: getUser
        }
      } as any,
      {
        redirect
      } as any,
      next
    );

    expect(next).not.toBeCalled();
    expect(getUser).toBeCalled();
    expect(redirect).toBeCalledWith("http://example.com/");
    expect(authorizeUser).not.toBeCalled();
  });

  it("redirects to Auth0 if user is not logged in", async () => {
    const handler = createLoginHandler({ authConfig: "authConfig" } as any);

    const next = jest.fn();
    const getUser = jest.fn(() => null);
    const redirect = jest.fn();
    await handler(
      {
        realHost: "https://example.com",
        user: {
          get: getUser
        },
        session: {
          set: jest.fn()
        }
      } as any,
      {
        redirect
      } as any,
      next
    );

    expect(next).not.toBeCalled();
    expect(getUser).toBeCalled();
    expect(redirect).toBeCalledWith(redirectTo);
    expect(authorizeUser).toBeCalledWith(
      [],
      "https://example.com/auth/callback",
      "authConfig"
    );
  });

  it("adds a CSRF secret to session if user is not logged in", async () => {
    const handler = createLoginHandler({ authConfig: "authConfig" } as any);

    const next = jest.fn();
    const getUser = jest.fn(() => null);
    const setSession = jest.fn(() => null);
    await handler(
      {
        realHost: "https://example.com",
        user: {
          get: getUser
        },
        session: {
          set: setSession
        }
      } as any,
      {
        redirect: jest.fn()
      } as any,
      next
    );

    expect(next).not.toBeCalled();
    expect(getUser).toBeCalled();
    expect(setSession).toBeCalledWith({
      csrfSecret: "secret"
    });
    expect(authorizeUser).toBeCalledWith(
      [],
      "https://example.com/auth/callback",
      "authConfig"
    );
  });
});
