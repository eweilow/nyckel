import { createLoggedOutHandler } from "../authLoggedout";

jest.mock("@nyckel/authentication", () => {
  const orig = jest.requireActual("@nyckel/authentication");
  return {
    ...orig
  };
});

describe("createLoggedOutHandler", () => {
  it("returns a function", () => {
    expect(typeof createLoggedOutHandler({} as any)).toBe("function");
  });

  it("deletes the session", async () => {
    const handler = createLoggedOutHandler({} as any);

    const next = jest.fn();
    const deleteSession = jest.fn();
    await handler(
      {
        session: {
          delete: deleteSession
        }
      } as any,
      {
        redirect: jest.fn()
      } as any,
      next
    );

    expect(next).not.toBeCalled();
    expect(deleteSession).toBeCalled();
  });

  it("redirects to /", async () => {
    const handler = createLoggedOutHandler({} as any);

    const next = jest.fn();
    const redirect = jest.fn();
    await handler(
      {
        session: {
          delete: jest.fn()
        }
      } as any,
      {
        redirect
      } as any,
      next
    );

    expect(next).not.toBeCalled();
    expect(redirect).toBeCalledWith("/");
  });
});
