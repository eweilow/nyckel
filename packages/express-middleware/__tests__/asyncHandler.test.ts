import { asyncHandler } from "../asyncHandler";

describe("asyncHandler", () => {
  it("handles resolved promises correctly", async () => {
    const req = {} as any;
    const res = {} as any;
    const handler = jest.fn(async () => {});
    const next = jest.fn();

    await asyncHandler(handler)(req, res, next);
    expect(handler).toBeCalledWith(req, res, next);
    expect(next).not.toBeCalled();
  });

  it("handles rejected promises correctly", async () => {
    const req = {} as any;
    const res = {} as any;
    const error = new Error("hmm");
    const handler = jest.fn(async () => {
      throw error;
    });
    const next = jest.fn();

    await asyncHandler(handler)(req, res, next);
    expect(handler).toBeCalledWith(req, res, next);
    expect(next).toBeCalledWith(error);
  });
});
