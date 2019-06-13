import { Verifier } from "../verifier";
import { verify } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

jest.mock("jwks-rsa");
jest.mock("jsonwebtoken");

describe("Verifier", () => {
  it("creates a jwksClient correctly", () => {
    const returnValue = {
      returned: "yes"
    };
    ((jwksClient as any) as jest.Mock).mockReturnValueOnce(returnValue);

    const verifier = new Verifier("param:jwksUri", "param:issuer");
    expect((jwksClient as any) as jest.Mock).toBeCalledWith({
      jwksUri: "param:jwksUri"
    });
    expect(verifier.client).toBe(returnValue);
  });

  it("runs verifyJWT correctly", async () => {
    const decoded = { decodedToken: "yes" };
    (verify as jest.Mock).mockImplementationOnce((a, b, c, cb) =>
      cb(null, decoded)
    );

    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const result = await verifier.verifyJWT("token");
    expect(verify as jest.Mock).toBeCalledWith(
      "token",
      verifier.getKey,
      {
        issuer: "param:issuer"
      },
      expect.any(Function)
    );
    expect(result).toBe(decoded);
  });

  it("rejects verifyJWT correctly", async () => {
    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const errors = [new Error("hmm"), 3, "error"];

    for (const error of errors) {
      const decoded = { decodedToken: "yes" };
      (verify as jest.Mock).mockImplementationOnce((a, b, c, cb) =>
        cb(error, decoded)
      );

      const promise = verifier.verifyJWT("token");
      await expect(promise).rejects.toBe(error);
    }
  });

  it("runs getKey properly when getSigningKey returns publicKey", async () => {
    const getSigningKey = jest.fn((id, cb) => {
      cb(null, { publicKey: "publicKey" });
    });
    ((jwksClient as any) as jest.Mock).mockReturnValueOnce({
      getSigningKey
    });
    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const promise = new Promise((resolve, reject) => {
      verifier.getKey({ kid: "kid" }, (err, key) =>
        err ? reject(err) : resolve(key)
      );
    });
    expect(getSigningKey).toBeCalledWith("kid", expect.any(Function));
    await expect(promise).resolves.toBe("publicKey");
  });

  it("runs getKey properly when getSigningKey returns rsaPublicKey", async () => {
    const getSigningKey = jest.fn((id, cb) => {
      cb(null, { rsaPublicKey: "rsaPublicKey" });
    });
    ((jwksClient as any) as jest.Mock).mockReturnValueOnce({
      getSigningKey
    });
    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const promise = new Promise((resolve, reject) => {
      verifier.getKey({ kid: "kid" }, (err, key) =>
        err ? reject(err) : resolve(key)
      );
    });
    expect(getSigningKey).toBeCalledWith("kid", expect.any(Function));
    await expect(promise).resolves.toBe("rsaPublicKey");
  });

  it("runs getKey properly when getSigningKey returns publicKey and rsaPublicKey", async () => {
    const getSigningKey = jest.fn((id, cb) => {
      cb(null, { publicKey: "publicKey", rsaPublicKey: "rsaPublicKey" });
    });
    ((jwksClient as any) as jest.Mock).mockReturnValueOnce({
      getSigningKey
    });
    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const promise = new Promise((resolve, reject) => {
      verifier.getKey({ kid: "kid" }, (err, key) =>
        err ? reject(err) : resolve(key)
      );
    });
    expect(getSigningKey).toBeCalledWith("kid", expect.any(Function));
    await expect(promise).resolves.toBe("publicKey");
  });

  it("rejects getKey properly when getSigningKey returns error", async () => {
    const error = new Error("err");
    const getSigningKey = jest.fn((id, cb) => {
      cb(error, null);
    });
    ((jwksClient as any) as jest.Mock).mockReturnValueOnce({
      getSigningKey
    });
    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const promise = new Promise((resolve, reject) => {
      verifier.getKey({ kid: "kid" }, (err, key) =>
        err ? reject(err) : resolve(key)
      );
    });
    expect(getSigningKey).toBeCalledWith("kid", expect.any(Function));
    await expect(promise).rejects.toBe(error);
  });

  it("rejects getKey properly when getSigningKey returns no keys", async () => {
    const getSigningKey = jest.fn((id, cb) => {
      cb(null, {});
    });
    ((jwksClient as any) as jest.Mock).mockReturnValueOnce({
      getSigningKey
    });
    const verifier = new Verifier("param:jwksUri", "param:issuer");
    const promise = new Promise((resolve, reject) => {
      verifier.getKey({ kid: "kid" }, (err, key) =>
        err ? reject(err) : resolve(key)
      );
    });
    expect(getSigningKey).toBeCalledWith("kid", expect.any(Function));
    await expect(promise).rejects.toThrowErrorMatchingSnapshot();
  });
});
