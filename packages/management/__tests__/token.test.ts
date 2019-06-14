import { getManagementToken } from "../token";

jest.mock("../methods/token", () => {
  return {
    fetchManagementToken: jest.fn(() => ({
      accessToken: "token",
      expires: 1000,
      scope: ["test", "test2"]
    }))
  };
});

describe("getManagementToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should work", async () => {
    const token = await getManagementToken({} as any);
    expect(token).toBe("token");
  });

  it("should work", async () => {
    const token = await getManagementToken({} as any);
    expect(token).toBe("token");
  });
});
