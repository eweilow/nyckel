import { enhanceRequestWithUser } from "../user";

describe("enhanceRequestWithUser", () => {
  it("should enhance a request correctly", () => {
    let req = {
      session: {} as any
    };

    let enhancedReq = enhanceRequestWithUser(
      req,
      "cookieName",
      "cookie",
      {} as any,
      {} as any,
      {} as any
    );

    expect(enhancedReq.user).toBeDefined();
    expect(typeof enhancedReq.user.get).toBe("function");
    expect(typeof enhancedReq.user.userInfo).toBe("function");
    expect(typeof enhancedReq.user.fullUserData).toBe("function");
    expect(typeof enhancedReq.user.permissions).toBe("function");
    expect(enhancedReq.user).toMatchSnapshot();
  });
});
