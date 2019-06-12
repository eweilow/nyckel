import {
  GlobalAuthenticationConfig,
  createRateLimiter
} from "@nyckel/authentication";
import fetch from "node-fetch";
import { getManagementUserInfo } from "../user";

jest.mock("node-fetch");

jest.mock("../../token", () => {
  return {
    getManagementToken: jest.fn(() => "token")
  };
});

jest.mock("@nyckel/authentication", () => {
  const instance = {
    ...jest.requireActual("@nyckel/authentication"),
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

describe("getManagementUserPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should wait for rate limiting correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          data: "data"
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    await getManagementUserInfo("id", config);

    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    const rateLimiter = require("@nyckel/authentication")
      .rateLimiter as ReturnType<typeof createRateLimiter>;
    expect(rateLimiter.wait).toBeCalledWith("*");
    expect(rateLimiter.wait).toBeCalledTimes(1);
  });

  it("should update rate limiting correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          data: "data"
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    await getManagementUserInfo("id", config);

    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    const rateLimiter = require("@nyckel/authentication")
      .rateLimiter as ReturnType<typeof createRateLimiter>;

    expect(rateLimiter.updateFromResponse).toBeCalledWith("*", fetchResponse);
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
        return {
          data: "data"
        };
      })
    };
    ((fetch as any) as jest.Mock)
      .mockReturnValueOnce(Promise.resolve(responseInstance1))
      .mockReturnValueOnce(Promise.resolve(responseInstance2));

    await getManagementUserInfo("id", config);

    const rateLimiter = require("@nyckel/authentication")
      .rateLimiter as ReturnType<typeof createRateLimiter>;

    expect(rateLimiter.updateFromResponse).toHaveBeenNthCalledWith(
      1,
      "*",
      responseInstance1
    );
    expect(rateLimiter.updateFromResponse).toHaveBeenNthCalledWith(
      2,
      "*",
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

    const promise = getManagementUserInfo("id", config);
    await expect(promise).rejects.toThrow();
    const err = await promise.catch(err => err);

    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(fetch).toBeCalledTimes(1);
    expect(err.message).toMatchSnapshot();
  });

  it("should return correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          data: "data"
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const data = await getManagementUserInfo("id", config);
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(data).toMatchSnapshot();
  });
});
