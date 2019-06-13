import { decodeJWT } from "../..";
import { decode } from "jsonwebtoken";

jest.mock("jsonwebtoken", () => {
  return {
    decode: jest.fn(inp => "decoded:" + inp)
  };
});

describe("decodeJWT", () => {
  it("passes jwt through", () => {
    const returnValue = decodeJWT("test");

    expect(decode).toBeCalledWith("test");
    expect(returnValue).toBe("decoded:test");
  });
});
