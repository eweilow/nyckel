import { verifyAndDecodeJWT } from "../..";
import { Verifier } from "../verifier";
import { verifierCache } from "../verify";

jest.mock("../verifier", () => {
  return {
    Verifier: jest.fn()
  };
});

describe("verifyAndDecodeJWT", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifierCache.reset();
  });

  it("works when no instances of Verifier has been created", async () => {
    const returnValue = {
      verifyJWT: jest.fn(jwt => "decoded:" + jwt)
    };
    ((Verifier as any) as jest.Mock).mockImplementationOnce(() => returnValue);
    const decoded = await verifyAndDecodeJWT("jwt", {
      authorizationDomain: "authorizationDomain",
      urls: {
        jwks: "urls:jwks",
        issuer: "urls:issuer"
      }
    } as any);
    expect(decoded).toBe("decoded:jwt");
    expect(returnValue.verifyJWT).toBeCalledWith("jwt");
  });

  it("creates no duplicate instances of Verifier", async () => {
    const returnValue = {
      verifyJWT: jest.fn(jwt => "decoded:" + jwt)
    };
    ((Verifier as any) as jest.Mock).mockImplementationOnce(() => returnValue);
    const decoded1 = await verifyAndDecodeJWT("jwt1", {
      authorizationDomain: "authorizationDomain",
      urls: {
        jwks: "urls:jwks",
        issuer: "urls:issuer"
      }
    } as any);
    expect(decoded1).toBe("decoded:jwt1");
    expect(returnValue.verifyJWT).toBeCalledWith("jwt1");
    expect((Verifier as any) as jest.Mock).toBeCalledTimes(1);
    expect((Verifier as any) as jest.Mock).toHaveBeenLastCalledWith(
      "urls:jwks",
      "urls:issuer"
    );

    const decoded2 = await verifyAndDecodeJWT("jwt2", {
      authorizationDomain: "authorizationDomain",
      urls: {
        jwks: "urls:jwks_2",
        issuer: "urls:issuer_2"
      }
    } as any);
    expect(decoded2).toBe("decoded:jwt2");
    expect(returnValue.verifyJWT).toBeCalledWith("jwt2");
    expect((Verifier as any) as jest.Mock).toBeCalledTimes(1);
    expect((Verifier as any) as jest.Mock).toHaveBeenLastCalledWith(
      "urls:jwks",
      "urls:issuer"
    );

    ((Verifier as any) as jest.Mock).mockImplementationOnce(() => returnValue);
    const decoded3 = await verifyAndDecodeJWT("jwt3", {
      authorizationDomain: "authorizationDomain2",
      urls: {
        jwks: "urls:jwks2",
        issuer: "urls:issuer2"
      }
    } as any);
    expect(decoded3).toBe("decoded:jwt3");
    expect(returnValue.verifyJWT).toBeCalledWith("jwt3");
    expect((Verifier as any) as jest.Mock).toBeCalledTimes(2);
    expect((Verifier as any) as jest.Mock).toHaveBeenLastCalledWith(
      "urls:jwks2",
      "urls:issuer2"
    );

    const decoded4 = await verifyAndDecodeJWT("jwt4", {
      authorizationDomain: "authorizationDomain2",
      urls: {
        jwks: "urls:jwks2_2",
        issuer: "urls:issuer2_2"
      }
    } as any);
    expect(decoded4).toBe("decoded:jwt4");
    expect(returnValue.verifyJWT).toBeCalledWith("jwt4");
    expect((Verifier as any) as jest.Mock).toBeCalledTimes(2);
    expect((Verifier as any) as jest.Mock).toHaveBeenLastCalledWith(
      "urls:jwks2",
      "urls:issuer2"
    );
  });
});
