import { SessionManager } from "@nyckel/sessions";

export type SessionInRequest = {
  delete(): Promise<void>;
  get<T = any>(): Promise<T>;
  set<T = any>(data: T): Promise<void>;
};

export function enhanceRequestWithSession<T>(
  request: T,
  cookieName: string,
  cookie: string,
  sessions: SessionManager,
  setCookie: (name: string, value: string) => void,
  clearCookie: (name: string) => void
): T & { session: SessionInRequest } {
  let enhancedRequest = request as T & { session: SessionInRequest };
  enhancedRequest.session = {
    async set(data) {
      let id = cookie;
      if (!sessions.isValidId(id)) {
        id = sessions.generateId();
      }
      setCookie(cookieName, id);
      await sessions.set(id, data);
    },
    async get() {
      const id = cookie;
      if (sessions.isValidId(id)) {
        const value = await sessions.get(id);
        if (value != null) {
          return value;
        }
      }
      return {};
    },
    async delete() {
      const id = cookie;
      if (sessions.isValidId(id)) {
        await sessions.delete(id);
        clearCookie(cookieName);
      }
    }
  };

  return enhancedRequest;
}
