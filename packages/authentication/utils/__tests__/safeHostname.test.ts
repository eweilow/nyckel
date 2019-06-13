import { getSafeHostname } from "../safeHostname";

describe("getSafeHostname", () => {
  it("uses forwarded host if trusted", () => {
    expect(
      getSafeHostname(
        "http:",
        "example-forwarded.com",
        "example.com",
        "remoteHost",
        (ip, val) => true
      )
    ).toBe("http://example-forwarded.com");
  });

  it("disregards forwarded host if not trusted", () => {
    expect(
      getSafeHostname(
        "http:",
        "example-forwarded.com",
        "example.com",
        "remoteHost",
        (ip, val) => false
      )
    ).toBe("http://example.com");
  });

  it("disregards forwarded host if remote address doesn't exist", () => {
    expect(
      getSafeHostname(
        "http:",
        "example-forwarded.com",
        "example.com",
        undefined,
        (ip, val) => false
      )
    ).toBe("http://example.com");
  });

  it("disregards forwarded host if not defined", () => {
    expect(
      getSafeHostname(
        "http:",
        null as any,
        "example.com",
        "remoteHost",
        (ip, val) => false
      )
    ).toBe("http://example.com");

    expect(
      getSafeHostname(
        "http:",
        undefined,
        "example.com",
        "remoteHost",
        (ip, val) => false
      )
    ).toBe("http://example.com");
  });
});
