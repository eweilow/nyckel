import { CSRFPair } from "./pair";
import { csrfTokensSingleton } from "./tokens";

export async function generateCSRFPair(): Promise<CSRFPair> {
  const secret = await csrfTokensSingleton.secret(); // The secret, stored in sessions
  const token = await csrfTokensSingleton.create(secret); // The state sent to Auth0

  return {
    secret,
    token
  };
}
