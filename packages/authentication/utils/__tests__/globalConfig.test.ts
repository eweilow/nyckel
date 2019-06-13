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
});
