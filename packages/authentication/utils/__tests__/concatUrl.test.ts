import { concatUrl } from "../concatUrl";

describe("concatUrl", () => {
  it("should work correctly", () => {
    const cases: [string, string][] = [
      ["https://example.com", "/test/test"],
      ["https://example.com", "https://example.com"],
      ["https://example.com", ""],
      ["https://example.com:3000", ""],
      ["http://example.com:3000", ""],
      ["http://example.com", ""]
    ];

    for (const [origin, pathname] of cases) {
      const url = concatUrl(origin, pathname);

      const parsed = new URL(url);
      expect({
        input: {
          origin,
          pathname
        },
        output: {
          url,
          origin: parsed.origin,
          pathname: parsed.pathname
        }
      }).toMatchSnapshot();
    }
  });
});
