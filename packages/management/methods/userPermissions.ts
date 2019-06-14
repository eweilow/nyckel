import { GlobalAuthenticationConfig, concatUrl } from "@nyckel/authentication";
import { managementRateLimiter } from "./limiter";
import fetch from "node-fetch";
import { getManagementToken } from "../token";

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

  const json = await response.json();

  if ("error" in json) {
    throw new Error(json.error + ": " + json.error_description);
  }

  return json;
}
