import fetch from "node-fetch";
import {
  requestToken,
  GlobalAuthenticationConfig,
  verifyAndDecodeJWT
} from "../..";

jest.mock("node-fetch");

jest.mock("../../jwt/verify", () => {
  return {
    verifyAndDecodeJWT: jest.fn(() => ({
      exp: 5000,
      iss: "issuer",
      aud: ["aud"]
    }))
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

describe("requestToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should fail if token_type was not Bearer", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "not bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should fail if refresh_token was not returned", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: undefined,
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should fail if access_token was not returned", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: undefined,
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should fail if id_token was not returned", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: undefined,
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should fail if expires_in was not returned", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: undefined
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should return correctly", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    const data = await requestToken("code", "redirectUrl", config);
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(data).toMatchSnapshot();
  });

  it("should return the expiration of access_token if it's shortest", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );
    (verifyAndDecodeJWT as jest.Mock).mockImplementation(token => {
      if (token === "id_token") {
        return {
          exp: 5500,
          iss: "issuer",
          aud: ["aud"]
        };
      }
      return {
        exp: 5000,
        iss: "issuer",
        aud: ["aud"]
      };
    });

    const data = await requestToken("code", "redirectUrl", config);
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(data).toMatchSnapshot();
    expect(data.expires).toBe(5000 * 1000);
  });

  it("should return the expiration of id_token if it's shortest", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );
    (verifyAndDecodeJWT as jest.Mock).mockImplementation(token => {
      if (token === "id_token") {
        return {
          exp: 4500,
          iss: "issuer",
          aud: ["aud"]
        };
      }
      return {
        exp: 5500,
        iss: "issuer",
        aud: ["aud"]
      };
    });

    const data = await requestToken("code", "redirectUrl", config);
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
    expect(data).toMatchSnapshot();
    expect(data.expires).toBe(4500 * 1000);
  });

  it("should not try parsing access_token if audience is config.urls.userinfo", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );
    (verifyAndDecodeJWT as jest.Mock).mockImplementation(() => {
      return {
        exp: 5500,
        iss: "issuer",
        aud: ["aud"]
      };
    });

    await requestToken("code", "redirectUrl", {
      ...config,
      audience: config.urls.userinfo
    });
    expect(verifyAndDecodeJWT).toBeCalledWith("id_token", expect.anything());
    expect(verifyAndDecodeJWT).not.toBeCalledWith(
      "access_token",
      expect.anything()
    );
    expect(verifyAndDecodeJWT).toBeCalledTimes(1);
  });

  it("should throw if id_token cannot be decoded", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    (verifyAndDecodeJWT as jest.Mock).mockImplementation(token => {
      if (token === "id_token") {
        throw new Error("Error");
      }
      return {
        exp: 5000,
        iss: "issuer",
        aud: ["aud"]
      };
    });

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });

  it("should throw if access_token cannot be decoded", async () => {
    const fetchResponse = {
      status: 200,
      json: jest.fn(() => {
        return {
          token_type: "Bearer",
          refresh_token: "refresh_token",
          access_token: "access_token",
          id_token: "id_token",
          expires_in: 1000
        };
      })
    };
    ((fetch as any) as jest.Mock).mockReturnValueOnce(
      Promise.resolve(fetchResponse)
    );

    (verifyAndDecodeJWT as jest.Mock).mockImplementation(token => {
      if (token === "access_token") {
        throw new Error("Error");
      }
      return {
        exp: 5000,
        iss: "issuer",
        aud: ["aud"]
      };
    });

    const promise = requestToken("code", "redirectUrl", config);
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
    expect(((fetch as any) as jest.Mock).mock.calls).toMatchSnapshot();
  });
});
