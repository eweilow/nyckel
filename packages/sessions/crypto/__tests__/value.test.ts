import { decryptData, encryptData } from "../value";

describe("encryption of whole data", () => {
  it("encrypts and decrypts correctly", () => {
    const id = "id";
    const salt = "salt";
    const secret = "secret";

    const original = {
      a: 1,
      b: 2,
      c: {
        d: 3
      }
    };

    const encrypted = encryptData(id, salt, secret, original);
    const decrypted = decryptData(id, salt, secret, encrypted);

    expect(original).toEqual(decrypted);
  });

  it("returns null and logs error in console if data is invalid", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const id = "id";
    const salt = "salt";
    const secret = "secret";

    const original = {
      a: 1,
      b: 2,
      c: {
        d: 3
      }
    };

    const encrypted = encryptData(id, salt, secret, original);
    const decrypted = decryptData(id, salt, secret, "s" + encrypted);

    expect(original).not.toEqual(decrypted);
    expect(decrypted).toEqual(null);
    expect(consoleSpy.mock.calls).toMatchSnapshot();
    consoleSpy.mockClear();
  });
});
