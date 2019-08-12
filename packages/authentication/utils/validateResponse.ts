import { formatAPIError } from "./formatError";

type ErrorResponseTokenBody = {
  error: string;
  error_description: string;
};

export function verifyAPIResponse<T>(
  code: number,
  response: T | ErrorResponseTokenBody,
  endpoint: string
): T {
  if ("error" in response) {
    throw new Error(
      formatAPIError(response.error, response.error_description, endpoint)
    );
  }
  if (code >= 400 && code < 600) {
    throw new Error(formatAPIError("got status " + code, null, endpoint));
  }
  return response;
}
