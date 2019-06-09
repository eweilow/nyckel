import { GlobalAuthenticationConfig } from "../utils/globalConfig";
import { verify } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import LRU from "lru-cache";

class Verifier {
  constructor(private jwksUri: string, private issuer: string) {}

  private client = jwksClient({
    jwksUri: this.jwksUri
  });

  private getKey = (
    header: { kid: string },
    callback: (err: Error | null, signingKey?: string) => void
  ) => {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err != null) {
        return callback(err);
      }

      const signingKey = key.publicKey || key.rsaPublicKey;
      if (signingKey == null) {
        return callback(new Error("signingKey cannot be null or undefined"));
      }

      callback(null, signingKey);
    });
  };

  async verifyJWT(token: string) {
    const decoded = await new Promise<DecodedJWT>((resolve, reject) => {
      verify(
        token,
        this.getKey as any,
        {
          issuer: this.issuer
        },
        (err, decoded) => {
          if (err) {
            return reject(err);
          }
          resolve(decoded as any);
        }
      );
    });

    return decoded;
  }
}

const verifierCache = new LRU<string, Verifier>({
  max: 10,
  maxAge: 7 * 24 * 60 * 60 * 1000 // A week
});

export type DecodedJWT = {
  exp: number;
  iss: string;
  aud: string[];
  sub?: string;
  iat?: string;
  scope?: string;
};

export async function verifyAndDecodeJWT(
  jwt: string,
  config: GlobalAuthenticationConfig
) {
  const key = config.authorizationDomain;
  let verifier!: Verifier;
  if (verifierCache.has(key)) {
    verifier = verifierCache.get(key) as Verifier;
  } else {
    verifier = new Verifier(config.urls.jwks, config.urls.issuer);
    verifierCache.set(key, verifier);
  }

  const decoded = await verifier.verifyJWT(jwt);
  return decoded;

  /*
  if (decoded.exp * 1000 < Date.now()) {
    const seconds = Math.floor(Date.now() / 1000 - decoded.exp);
    throw new Error(
      `Token was invalid: already expired ${seconds} seconds ago`
    );
  }

  if (new URL(decoded.iss).href !== new URL(config.authorizationDomain).href) {
    throw new Error(
      `Token was invalid: issuer '${decoded.iss}' does not match expected '${
        config.authorizationDomain
      }'`
    );
  }
  */
}
