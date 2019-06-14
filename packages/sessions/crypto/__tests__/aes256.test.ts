import { encrypt, decrypt } from "../aes256";

const invalidCases = [undefined, null, "", 0, true, () => {}, new Date()];

describe("aes256", () => {
  describe("encrypt", () => {
    it("throws if key not provided properly", () => {
      for (const c of invalidCases) {
        expect(() => {
          encrypt(c as any, "plaintext");
        }).toThrowErrorMatchingSnapshot();
      }
    });
    it("throws if plaintext not provided properly", () => {
      for (const c of invalidCases) {
        expect(() => {
          encrypt("key", c as any);
        }).toThrowErrorMatchingSnapshot();
      }
    });
  });

  describe("decrypt", () => {
    it("throws if key not provided properly", () => {
      for (const c of invalidCases) {
        expect(() => {
          decrypt(c as any, "encrypted");
        }).toThrowErrorMatchingSnapshot();
      }
    });

    it("throws if encrypted not provided properly", () => {
      for (const c of invalidCases) {
        expect(() => {
          decrypt("key", c as any);
        }).toThrowErrorMatchingSnapshot();
      }
    });

    it("throws if input length is less than 17", () => {
      const input = "test";
      expect(() => {
        decrypt("key", input);
      }).toThrowErrorMatchingSnapshot();
    });
  });

  it("encrypts and decrypts correctly", () => {
    const key = "key";
    const value = "value";
    const encrypted = encrypt(key, value);
    expect(decrypt(key, encrypted)).toBe(value);
  });

  it("randomly initializes first 16 bytes", () => {
    const key = "key";
    const value = "value";
    const encrypted1 = encrypt(key, value);
    const encrypted2 = encrypt(key, value);
    expect(encrypted1).not.toEqual(encrypted2);

    const decrypt1 = decrypt(key, encrypted1);
    const decrypt2 = decrypt(key, encrypted2);
    expect(decrypt1).toEqual(decrypt2);
  });
});
