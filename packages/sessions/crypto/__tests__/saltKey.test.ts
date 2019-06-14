import { saltKey } from "../salt";

describe("saltKey", () => {
  it("returns a key", () => {
    expect(saltKey("id", "salt", "salta", "saltb")).toBe("idsaltsaltasaltb");
  });
});
