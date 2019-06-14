import { createCallbackHandler } from "../authCallback";
import { verifyCSRFPair, requestToken } from "@nyckel/authentication";

const requestTokenData = { requestTokenData: "yes" };
jest.mock("@nyckel/authentication", () => {
  const orig = jest.requireActual("@nyckel/authentication");
  return {
    ...orig,
    requestToken: jest.fn(async () => requestTokenData),
    verifyCSRFPair: jest.fn(async ({ secret, token }) => {
      if (secret === "secret" && token === "state") {
        return;
      }
      throw new Error("Unable to verify CSRF pair (test message)");
    })
  };
});

describe("createCallbackHandler", () => {
  it("returns a function", () => {
    expect(typeof createCallbackHandler({} as any)).toBe("function");
  });

  it("throws if state is not in query", async () => {
    const handler = createCallbackHandler({} as any);

    const next = jest.fn();
    await handler(
      {
        query: {}
      } as any,
      {} as any,
      next
    );

    expect(next).toBeCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  it("throws if code is not in query", async () => {
    const handler = createCallbackHandler({} as any);

    const next = jest.fn();
    await handler(
      {
        query: {
          state: "yes"
        }
      } as any,
      {} as any,
      next
    );

    expect(next).toBeCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  it("throws if csrfSecret is not in session", async () => {
    const handler = createCallbackHandler({} as any);

    const session = {
      get: jest.fn(async () => ({})),
      delete: jest.fn(async () => {})
    };

    const next = jest.fn();
    await handler(
      {
        query,
        session
      } as any,
      {} as any,
      next
    );

    expect(next).toBeCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  const query = {
    state: "state",
    code: "code"
  };

  it("attempts to verify the CSRF pair and deletes session if it cannot verify the pair", async () => {
    const handler = createCallbackHandler({} as any);

    const session = {
      get: jest.fn(async () => ({ csrfSecret: "invalidSecret" })),
      delete: jest.fn(async () => {})
    };

    const next = jest.fn();
    await handler(
      {
        query,
        session
      } as any,
      {} as any,
      next
    );

    expect(session.get).toBeCalledTimes(1);
    expect(verifyCSRFPair).toBeCalled();
    expect(session.delete).toBeCalledTimes(1);

    expect(next).toBeCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  it("attempts to verify the CSRF pair and handles correctly if it can verify the pair", async () => {
    const handler = createCallbackHandler({ authConfig: "authConfig" } as any);

    const session = {
      get: jest.fn(async () => ({ csrfSecret: "secret" })),
      delete: jest.fn(async () => {}),
      set: jest.fn(async () => {})
    };

    const redirect = jest.fn();

    const next = jest.fn();
    await handler(
      {
        realHost: "http://example.com",
        query,
        session
      } as any,
      {
        redirect
      } as any,
      next
    );

    expect(session.get).toBeCalledTimes(1);
    expect(verifyCSRFPair).toBeCalled();
    expect(session.delete).not.toBeCalled();
    expect(next).not.toBeCalled();

    expect(requestToken).toBeCalledWith(
      "code",
      "http://example.com/auth/callback",
      "authConfig"
    );
    expect(session.set).toBeCalledWith(requestTokenData);

    expect(redirect).toBeCalledWith("http://example.com/");
  });
});
