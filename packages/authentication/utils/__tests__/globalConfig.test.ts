import { createGlobalAuthenticationConfig } from "../..";

describe("createGlobalAuthenticationConfig", () => {
  it("should work correctly", () => {
    expect(
      createGlobalAuthenticationConfig(
        "param:clientId",
        "param:clientSecret",
        "http://domain.com",
        "param:audience"
      )
    ).toMatchSnapshot();
  });
  it("should work correctly without audience", () => {
    const cfg = createGlobalAuthenticationConfig(
      "param:clientId",
      "param:clientSecret",
      "http://domain.com"
    );
    expect(cfg).toMatchSnapshot();
    expect(cfg.audience).toBe(cfg.urls.userinfo);
  });
});
