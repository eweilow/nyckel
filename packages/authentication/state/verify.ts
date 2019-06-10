import { CSRFPair } from "./pair";
import { csrfTokensSingleton } from "./tokens";

export async function verifyCSRFPair(pair: CSRFPair) {
  if (!pair.secret) {
    throw new Error("Missing CSRF pair secret!");
  }
  if (!pair.token) {
    throw new Error("Missing CSRF pair token!");
  }
  if (!csrfTokensSingleton.verify(pair.secret, pair.token)) {
    throw new Error(
      "The provided CSRF pair was not valid (token does not match secret)"
    );
  }
}
