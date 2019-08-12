import { createPromiseDebounce } from "./utils/promiseDebounce";
import { fetchManagementToken } from "./methods/token";

const tokenDebouncer = createPromiseDebounce(
  fetchManagementToken,
  data => data.accessToken,
  data => data.expires < Date.now() + 60000
);

export const getManagementToken = tokenDebouncer.get;
