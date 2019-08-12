import {
  GlobalAuthenticationConfig,
  concatUrl,
  verifyAPIResponse
} from "@nyckel/authentication";
import { managementRateLimiter } from "./limiter";
import fetch from "node-fetch";
import { getManagementToken } from "../token";

export async function getManagementUserRoles(
  id: string,
  config: GlobalAuthenticationConfig
) {
  await managementRateLimiter.wait("*");

  const url = concatUrl(
    config.authorizationDomain,
    "/api/v2/users/" + encodeURIComponent(id) + "/roles"
  );
  const token = await getManagementToken(config);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  managementRateLimiter.updateFromResponse("*", response);
  if (response.status === 429) {
    return getManagementUserRoles(id, config);
  }

  const json = await response.json();

  return verifyAPIResponse(
    response.status,
    json,
    concatUrl(config.authorizationDomain, "/api/v2/users/<id>/roles")
  );
}
