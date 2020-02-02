export type AuthConfig = {
  auth0ClientId: string;
  auth0ClientSecret: string;
  auth0ClientDomain: string;
  auth0ClientAudience: string;
  auth0ManagementClientId: string;
  auth0ManagementClientSecret: string;
  sessionSalt: string;
  sessionSecret: string;
  cookieName: string;
  trustProxyFn?: (ip?: string) => boolean;
};

export function createAuthConfig(cb: () => AuthConfig) {
  return cb();
}
