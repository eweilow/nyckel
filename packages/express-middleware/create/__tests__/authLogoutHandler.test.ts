import { createLogoutHandler } from "../authLogout";
import { logoutUser } from "@nyckel/authentication";

const redirectTo = "https://example.com/redirect/to";
jest.mock("@nyckel/authentication", () => {
  const orig = jest.requireActual("@nyckel/authentication");
  return {
    ...orig,
    logoutUser: jest.fn(async () => {
      return {
        redirectTo
      };
    })
  };
});

describe("createCallbackHandler", () => {
  it("returns a function", () => {
    expect(typeof createLogoutHandler({} as any)).toBe("function");
  });

  it("redirects to Auth0", async () => {
    const handler = createLogoutHandler({ authConfig: "authConfig" } as any);

    const next = jest.fn();
    const redirect = jest.fn();
    await handler(
      {
        realHost: "https://example.com",
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
    expect(logoutUser).toBeCalledWith(
      "https://example.com/auth/loggedout",
      "authConfig"
    );
    expect(redirect).toBeCalledWith(redirectTo);
  });
});
