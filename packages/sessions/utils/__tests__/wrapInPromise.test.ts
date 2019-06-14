import { wrapInPromise } from "../wrapInPromise";

describe("wrapInPromise", () => {
  it("resolves correctly", async () => {
    const data = { a: 1 };
    await expect(wrapInPromise(cb => cb(null, data))).resolves.toBe(data);
    await expect(wrapInPromise(cb => cb(undefined, data))).resolves.toBe(data);
  });

  it("rejects correctly for errors", async () => {
    const err = new Error("err");
    const promise = wrapInPromise(cb => cb(err, null));
    await expect(promise).rejects.toThrowError(err);
  });

  it("rejects correctly for non-falsy values", async () => {
    const errorValues = [3, true, "test", () => {}, {}];

    for (const err of errorValues) {
      const promise = wrapInPromise(cb => cb(err, null));
      await expect(promise).rejects.toEqual(err as any);
    }
  });
});
