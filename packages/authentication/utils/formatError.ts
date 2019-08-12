export function formatAPIValidationError(error: string) {
  return "[Nyckel] Encountered a validation error: " + error;
}

export function formatAPIError(
  error: string,
  description: string | null,
  endpoint: string
) {
  let msg = `[Nyckel] Encountered an Auth0 API error on '${endpoint}': ${error}`;
  if (description != null) {
    msg += ", " + description;
  }
  return msg;
}
