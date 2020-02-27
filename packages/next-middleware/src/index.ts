export {
  handleAuth,
  AuthState,
  createAuthConfig,
  AuthConfig
} from "@nyckel/service-middleware";

export { callbackMethod } from "./methods/callback";
export { loggedOutMethod } from "./methods/loggedout";
export { startLoginMethod } from "./methods/login";
export { logoutMethod } from "./methods/logout";

export {
  callbackRoute,
  loggedOutRoute,
  logoutRoute,
  startLoginRoute
} from "./apiRoutes";
