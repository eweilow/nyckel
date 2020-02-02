export { handleAuth, AuthState } from "./middleware";

export { callbackMethod } from "./methods/callback";
export { loggedOutMethod } from "./methods/loggedout";
export { startLoginMethod } from "./methods/login";
export { logoutMethod } from "./methods/logout";

export { createAuthConfig } from "./config";
export {
  callbackRoute,
  loggedOutRoute,
  logoutRoute,
  startLoginRoute
} from "./apiRoutes";
