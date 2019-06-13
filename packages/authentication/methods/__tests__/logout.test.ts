import { authorizeUser, GlobalAuthenticationConfig, logoutUser } from "../..";

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

describe("logoutUser", () => {
  it("returns correctly", async () => {
    const data = await logoutUser("redirectUri", config);
    expect(data).toMatchSnapshot();
  });
});
