import fetch from "node-fetch";
import { GlobalAuthenticationConfig, getUserInfo } from "../..";
import { createRateLimiter } from "../../utils/rateLimiter";

jest.mock("node-fetch");

jest.mock("../../jwt/decode", () => {
  return {
    decodeJWT: jest.fn(() => ({ sub: "sub" }))
  };
});

jest.mock("../../utils/rateLimiter", () => {
  const instance = {
    rateLimiter: {
      wait: jest.fn(),
      updateFromResponse: jest.fn()
    },
    createRateLimiter: jest.fn(() => {
      return instance.rateLimiter;
    })
  };

  return instance;
});

const config: GlobalAuthenticationConfig = {
  audience: "param:audience",
  authorizationDomain: "param:authorizationDomain",
  clientId: "param:clientId",
  clientSecret: "param:clientSecret",
  urls: {
    authorization: "url:authorization",
    issuer: "url:issuer",
    jwks: "url:jwks",
    logout: "url:logout",
    token: "url:token",
    userinfo: "url:userinfo"
  }
};

const baseData = {
  sub: "sub",
  name: "name",
  nickname: "nickname",
  picture: "picture",
  email: "email",
  email_verified: false,
  updated_at: "2018-10-21"
};

describe("getUserInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should wait for rate limiting correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return baseData;
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    await getUserInfo("accessToken", config);

    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    const rateLimiter = require("../../utils/rateLimiter")
      .rateLimiter as ReturnType<typeof createRateLimiter>;
    expect(rateLimiter.wait).toBeCalledWith("sub");
    expect(rateLimiter.wait).toBeCalledTimes(1);
  });

  it("should update rate limiting correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return baseData;
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    await getUserInfo("accessToken", config);

    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    const rateLimiter = require("../../utils/rateLimiter")
      .rateLimiter as ReturnType<typeof createRateLimiter>;

    expect(rateLimiter.updateFromResponse).toBeCalledWith("sub", fetchResponse);
    expect(rateLimiter.updateFromResponse).toBeCalledTimes(1);
  });

  it("should re-attempt if rate limited", async () => {
    let responseInstance1 = {
      status: 429,
      json: jest.fn(() => {
        throw new Error("Rate limited!");
      })
    };
    let responseInstance2 = {
      status: 200,
      json: jest.fn(() => {
        return baseData;
      })
    };
    ((fetch as any) as jest.Mock)
      .mockReturnValueOnce(Promise.resolve(responseInstance1))
      .mockReturnValueOnce(Promise.resolve(responseInstance2));

    await getUserInfo("accessToken", config);

    const rateLimiter = require("../../utils/rateLimiter")
      .rateLimiter as ReturnType<typeof createRateLimiter>;

    expect(rateLimiter.updateFromResponse).toHaveBeenNthCalledWith(
      1,
      "sub",
      responseInstance1
    );
    expect(rateLimiter.updateFromResponse).toHaveBeenNthCalledWith(
      2,
      "sub",
      responseInstance2
    );
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(fetch).toBeCalledTimes(2);
    expect(rateLimiter.wait).toBeCalledTimes(2);
    expect(rateLimiter.updateFromResponse).toBeCalledTimes(2);
  });

  it("should fail if error", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          error: "oh no",
          error_description: "something bad happened"
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const promise = getUserInfo("accessToken", config);
    await expect(promise).rejects.toThrow();
    const err = await promise.catch(err => err);

    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(fetch).toBeCalledTimes(1);
    expect(err.message).toMatchSnapshot();
  });

  describe("fail on missing data", () => {
    for (const key of Object.keys(baseData)) {
      it(`throws if ${key} is missing from body`, async () => {
        const fetchResponse = {
          status: 200,
          json: jest.fn(() => {
            return { ...baseData, [key]: undefined };
          })
        };
        ((fetch as any) as jest.Mock).mockReturnValueOnce(
          Promise.resolve(fetchResponse)
        );
        const promise = getUserInfo("accessToken", config);
        await expect(promise).rejects.toThrowErrorMatchingSnapshot();
      });
    }

    for (const key of Object.keys(baseData)) {
      it(`throws if ${key} is an invalid type`, async () => {
        const fetchResponse = {
          status: 200,
          json: jest.fn(() => {
            return { ...baseData, [key]: 3 };
          })
        };
        ((fetch as any) as jest.Mock).mockReturnValueOnce(
          Promise.resolve(fetchResponse)
        );
        const promise = getUserInfo("accessToken", config);
        await expect(promise).rejects.toThrowErrorMatchingSnapshot();
      });
    }
  });

  it("should return correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return baseData;
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const data = await getUserInfo("accessToken", config);
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(data).toMatchSnapshot();

    expect(data.updatedAt).toBeInstanceOf(Date);
  });

  it("logs to console.info", async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const spy = jest.spyOn(console, "info").mockImplementation(() => {});

    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return baseData;
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    await getUserInfo("accessToken", config);

    expect(spy.mock.calls).toMatchSnapshot();
    spy.mockRestore();
    process.env.NODE_ENV = original;
  });
});
