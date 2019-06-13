import { authorizeUser, GlobalAuthenticationConfig } from "../..";

jest.mock("../../state/generate", () => {
  return {
    generateCSRFPair: jest.fn(() => {
      return {
        secret: "secret",
        token: "token"
      };
    })
  };
});

const config: GlobalAuthenticationConfig = {
  audience: "param:audience",
  authorizationDomain: "http://param:authorizationDomain.com",
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

describe("authorizeUser", () => {
  it("returns correctly", async () => {
    const data = await authorizeUser(
      ["scopeA", "scopeB"],
      "redirectUri",
      config
    );
    expect(data).toMatchSnapshot();
  });
});
