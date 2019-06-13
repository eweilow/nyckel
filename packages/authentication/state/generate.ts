import { CSRFPair } from "./pair";
import { csrfTokensSingleton } from "./tokens";
import CSRF from "csrf";

export async function generateCSRFPair(
  instance: CSRF = csrfTokensSingleton
): Promise<CSRFPair> {
  const secret = await instance.secret(); // The secret, stored in sessions
  const token = await instance.create(secret); // The state sent to Auth0

  return {
    secret,
    token
  };
}
