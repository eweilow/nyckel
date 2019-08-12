import { CSRFPair } from "./pair";
import { csrfTokensSingleton } from "./tokens";
import { formatAPIValidationError } from "../utils/formatError";

export async function verifyCSRFPair(pair: CSRFPair) {
  if (!pair.secret) {
    throw new Error(formatAPIValidationError("missing CSRF pair secret!"));
  }
  if (!pair.token) {
    throw new Error(formatAPIValidationError("missing CSRF pair token!"));
  }
  if (csrfTokensSingleton.verify(pair.secret, pair.token) !== true) {
    throw new Error(
      formatAPIValidationError(
        "the provided CSRF pair was not valid (token does not match secret)"
      )
    );
  }
}
