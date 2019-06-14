import { createKeyHash } from "../key";

describe("createKeyHash", () => {
  it("returns a hash", () => {
    expect(createKeyHash("id", "salt")).toMatchSnapshot();
  });
  it("returns the same thing for given id and salt", () => {
    expect(createKeyHash("id", "salt")).toBe(createKeyHash("id", "salt"));
  });
});
