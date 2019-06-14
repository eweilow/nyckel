import { generateCSRFPair } from "../generate";
import CSRF from "csrf";
import { csrfTokensSingleton } from "../tokens";
import { verifyCSRFPair } from "../..";

jest.mock("../tokens", () => {
  const CSRF = jest.requireActual("csrf");
  class Instance extends CSRF {
    constructor() {
      super();
    }

    secret = jest.fn(() => Promise.resolve("singleton:secret")) as any;
    create = jest.fn(() => Promise.resolve("singleton:token")) as any;
    verify = jest.fn(
      (secret, token) =>
        secret === "singleton:secret" && token === "singleton:token"
    ) as any;
  }
  return {
    csrfTokensSingleton: new Instance()
  };
});

describe("csrfTokensSingleton", () => {
  it("is instance of CSRF", () => {
    expect(csrfTokensSingleton).toBeInstanceOf(CSRF);
  });
});

describe("generateCSRFPair", () => {
  it("generates correctly", async () => {
    const generateSecret = jest.fn(() => Promise.resolve("secret"));
    const createToken = jest.fn(() => Promise.resolve("token"));

    const instance = {
      secret: generateSecret,
      create: createToken
    };

    expect(await generateCSRFPair(instance as any)).toEqual({
      secret: "secret",
      token: "token"
    });

    expect(generateSecret).toBeCalled();
    expect(createToken).toBeCalledWith(
      await generateSecret.mock.results[0].value
    );
  });

  it("generates correctly with default parameter", async () => {
    expect(await generateCSRFPair()).toEqual({
      secret: "singleton:secret",
      token: "singleton:token"
    });
    expect(csrfTokensSingleton.secret).toBeCalled();
    expect(csrfTokensSingleton.create).toBeCalledWith(
      await (csrfTokensSingleton.secret as jest.Mock).mock.results[0].value
    );
  });
});

describe("verifyCSRFPair", () => {
  it("throws on missing secret", async () => {
    await expect(
      verifyCSRFPair({ token: "token" } as any)
    ).rejects.toThrowErrorMatchingSnapshot();
  });
  it("throws on missing token", async () => {
    await expect(
      verifyCSRFPair({ secret: "secret" } as any)
    ).rejects.toThrowErrorMatchingSnapshot();
  });
  it("throws if unable to verify", async () => {
    await expect(
      verifyCSRFPair({ secret: "secret", token: "token" } as any)
    ).rejects.toThrowErrorMatchingSnapshot();
  });
  it("doesn't throw if it can verify", async () => {
    await expect(
      verifyCSRFPair({
        secret: "singleton:secret",
        token: "singleton:token"
      } as any)
    ).resolves.toBeUndefined();
  });
});
