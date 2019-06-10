import { GlobalAuthenticationConfig, concatUrl } from "@nyckel/authentication";
import { managementRateLimiter } from "./limiter";
import { getManagementToken } from "./token";
import fetch from "node-fetch";

export async function getManagementUserPermissions(
  id: string,
  config: GlobalAuthenticationConfig
) {
  await managementRateLimiter.wait("*");

  const url = concatUrl(
    config.authorizationDomain,
    "/api/v2/users/" + encodeURIComponent(id) + "/permissions"
  );
  const token = await getManagementToken(config);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  managementRateLimiter.updateFromResponse("*", response);
  if (response.status === 429) {
    return getManagementUserPermissions(id, config);
  }

  return response.json();
}
