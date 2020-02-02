import { ServerResponse } from "http";

export function redirectResponse(
  res: ServerResponse,
  to: string,
  permanent: boolean
) {
  if (permanent) {
    res.statusCode = 301;
  } else {
    res.statusCode = 302;
  }
  res.setHeader("Location", to);
}
