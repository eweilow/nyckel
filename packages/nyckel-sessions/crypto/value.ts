import { saltKey } from "./salt";
import { encrypt, decrypt } from "./aes256";

function password(id: string, salt: string, secret: string) {
  return saltKey(id, salt, secret);
}

export function encryptData<T>(
  id: string,
  salt: string,
  secret: string,
  data: T
): string {
  const key = password(id, salt, secret);
  return encrypt(key, JSON.stringify({ data }));
}

export function decryptData<T>(
  id: string,
  salt: string,
  secret: string,
  encrypted: string
): T | null {
  try {
    const key = password(id, salt, secret);
    const decrypted = decrypt(key, encrypted);

    const { data } = JSON.parse(decrypted) as {
      data: T;
    };

    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}
