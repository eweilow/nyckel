import { verify } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { DecodedAccessToken } from "./verify";

export class Verifier {
  constructor(private jwksUri: string, private issuer: string) {}

  readonly client = jwksClient({
    jwksUri: this.jwksUri
  });

  readonly getKey = (
    header: { kid: string },
    callback: (err: Error | null, signingKey?: string) => void
  ) => {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err != null) {
        return callback(err);
      }

      const signingKey = "publicKey" in key ? key.publicKey : key.rsaPublicKey;
      if (signingKey == null) {
        return callback(
          new Error("[Nyckel] signingKey cannot be null or undefined")
        );
      }

      callback(null, signingKey);
    });
  };

  async verifyJWT(token: string) {
    return new Promise<DecodedAccessToken>((resolve, reject) => {
      verify(
        token,
        this.getKey as any,
        {
          issuer: this.issuer
        },
        (err, decoded) => {
          if (err != null) {
            return reject(err);
          }
          resolve(decoded as any);
        }
      );
    });
  }
}
