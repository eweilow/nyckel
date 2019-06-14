import { pickFirst } from "../safeHostname";

describe("pickFirst", () => {
  it("picks the first comma-separated part of a string", () => {
    expect(pickFirst("first,second,third")).toBe("first");
    expect(pickFirst("first ,second,third")).toBe("first");
    expect(pickFirst(" first ,second,third")).toBe("first");
    expect(pickFirst(" first, second,third")).toBe("first");
  });
  it("returns null if input string is null or undefined", () => {
    expect(pickFirst(null as any)).toBe(null);
    expect(pickFirst(undefined)).toBe(null);
  });
  it("returns null if input string is falsy", () => {
    expect(pickFirst("")).toBe(null);
    expect(pickFirst(false as any)).toBe(null);
  });
});
