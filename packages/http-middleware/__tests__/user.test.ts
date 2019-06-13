import { enhanceRequestWithUser, isTokenExpired } from "../user";
import { SessionManager } from "@nyckel/sessions";
import { enhanceRequestWithSession } from "../session";
import { attemptToRefreshToken, getUserInfo } from "@nyckel/authentication";
import {
  getManagementUserInfo,
  getManagementUserRoles,
  getManagementUserPermissions
} from "../../management";

jest.mock("@nyckel/authentication", () => {
  return {
    attemptToRefreshToken: jest.fn(() => ({
      refreshedSession: true,
      expires: 1500,
      accessToken: "refreshedAccessToken",
      idToken: "refreshedIdToken"
    })),
    getUserInfo: jest.fn(data => "getUserInfo"),
    decodeJWT: jest.fn(data => ({ data }))
  };
});

jest.mock("@nyckel/management", () => {
  return {
    getManagementUserInfo: jest.fn(data => "getManagementUserInfo"),
    getManagementUserRoles: jest.fn(data => "getManagementUserRoles"),
    getManagementUserPermissions: jest.fn(
      data => "getManagementUserPermissions"
    )
  };
});

describe("isTokenExpired", () => {
  it("expires with defaults", () => {
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => 1000);

    expect(isTokenExpired(999 + 10 * 60 * 1000)).toBe(true);
    expect(isTokenExpired(1000 + 10 * 60 * 1000)).toBe(true);
    expect(isTokenExpired(1001 + 10 * 60 * 1000)).toBe(false);

    dateNowSpy.mockRestore();
  });

  it("expires at exact time", () => {
    expect(isTokenExpired(1000, 1000, 0)).toBe(true);
    expect(isTokenExpired(1000, 999, 0)).toBe(false);
  });

  it("expires at exact time with margin", () => {
    expect(isTokenExpired(1000, 900, 100)).toBe(true);
    expect(isTokenExpired(1000, 899, 100)).toBe(false);

    expect(isTokenExpired(1000, 1100, 100)).toBe(true);
    expect(isTokenExpired(1000, 999, 100)).toBe(true);
  });
});

const cookieName = "cookieName";

describe("enhanceRequestWithUser", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function createRequest<T>(sessions: T, cookieName: string, cookie: string) {
    let req = {};

    const setCookie = jest.fn();
    const clearCookie = jest.fn();

    let enhancedReq = enhanceRequestWithSession(
      req,
      cookieName,
      cookie,
      sessions as any,
      setCookie,
      clearCookie
    );

    enhancedReq.session.delete = jest.fn(enhancedReq.session.delete);
    enhancedReq.session.get = jest.fn(enhancedReq.session.get);
    enhancedReq.session.set = jest.fn(enhancedReq.session.set);
    return enhancedReq;
  }

  it("should enhance a request correctly", () => {
    const cookie = "valid";

    let req = createRequest({}, cookieName, cookie);

    let enhancedReq = enhanceRequestWithUser(
      req,
      cookieName,
      cookie,
      {} as any,
      {} as any,
      {} as any
    );

    expect(req).toBe(enhancedReq);
    expect(enhancedReq.user).toBeDefined();
    expect(typeof enhancedReq.user.get).toBe("function");
    expect(typeof enhancedReq.user.userInfo).toBe("function");
    expect(typeof enhancedReq.user.fullUserData).toBe("function");
    expect(typeof enhancedReq.user.permissions).toBe("function");
    expect(enhancedReq.user).toMatchSnapshot();
  });

  describe(".get", () => {
    it("should return null if cookie is invalid", async () => {
      const cookie = "invalid";

      const sessions: SessionManager = {
        client: {} as any,
        delete: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };
      let req = createRequest(sessions, cookieName, cookie);

      let enhancedReq = enhanceRequestWithUser(
        req,
        cookieName,
        cookie,
        sessions,
        {} as any,
        {} as any
      );

      const user = await enhancedReq.user.get();
      expect(user).toBe(null);
      expect(req.session.get).not.toHaveBeenCalled();
    });

    it("should return null if session is invalid", async () => {
      const cookie = "valid";

      const sessions: SessionManager = {
        client: {} as any,
        delete: jest.fn(),
        get: jest.fn(async () => null),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };
      let req = createRequest(sessions, cookieName, cookie);

      req.session.get = jest.fn(async () => null) as any;

      let enhancedReq = enhanceRequestWithUser(
        req,
        cookieName,
        cookie,
        sessions,
        {} as any,
        {} as any
      );

      const user = await enhancedReq.user.get();
      expect(user).toBe(null);
      expect(req.session.get).toHaveBeenCalled();
    });

    it("should return null if session has no access token", async () => {
      const cookie = "valid";

      const sessions: SessionManager = {
        client: {} as any,
        delete: jest.fn(),
        get: jest.fn(async () => ({} as any)),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };
      let req = createRequest(sessions, cookieName, cookie);

      let enhancedReq = enhanceRequestWithUser(
        req,
        cookieName,
        cookie,
        sessions,
        {} as any,
        {} as any
      );

      const user = await enhancedReq.user.get();
      expect(user).toBe(null);
      expect(req.session.get).toHaveBeenCalled();
    });

    describe("token refreshing", () => {
      it("should attempt to refresh token if acquired lock", async () => {
        const cookie = "valid";

        const dateNowSpy = jest
          .spyOn(Date, "now")
          .mockImplementation(() => 1100);

        const session = {
          accessToken: "accessToken",
          idToken: "idToken",
          expires: 1000
        } as any;

        const lockRelease = jest.fn();
        const sessions: SessionManager = {
          client: {} as any,
          delete: jest.fn(),
          get: jest.fn(async () => session),
          has: jest.fn(),
          lock: jest.fn(
            () => ({ acquired: true, release: lockRelease } as any)
          ),
          set: jest.fn(),
          isValidId: jest.fn(id => id === "valid"),
          generateId: jest.fn()
        };
        let req = createRequest(sessions, cookieName, cookie);

        const authConfig = { auth: true } as any;
        let enhancedReq = enhanceRequestWithUser(
          req,
          cookieName,
          cookie,
          sessions,
          authConfig,
          {} as any,
          0
        );

        const user = await enhancedReq.user.get();
        expect(user).not.toBe(null);

        expect(req.session.get).toHaveBeenCalled();
        expect(dateNowSpy).toHaveBeenCalled();
        expect(sessions.lock).toHaveBeenCalledWith("valid", 5000);

        expect(attemptToRefreshToken).toHaveBeenCalledWith(session, authConfig);
        expect((sessions.set as jest.Mock).mock.calls).toEqual([
          [
            cookie,
            {
              ...session,
              accessToken: "refreshedAccessToken",
              idToken: "refreshedIdToken",
              expires: 1500,
              refreshedSession: true
            }
          ]
        ]);

        expect(sessions.lock).toHaveBeenCalledTimes(1);
        expect(lockRelease).toHaveBeenCalledTimes(1);

        expect(user).toMatchSnapshot();

        dateNowSpy.mockRestore();
      });

      it("should not attempt to refresh token if failed to acquire lock", async () => {
        const cookie = "valid";

        const dateNowSpy = jest
          .spyOn(Date, "now")
          .mockImplementation(() => 1100);

        const session = {
          accessToken: "accessToken",
          idToken: "idToken",
          expires: 1000
        } as any;

        const lockRelease = jest.fn();
        const sessions: SessionManager = {
          client: {} as any,
          delete: jest.fn(),
          get: jest.fn(async () => session),
          has: jest.fn(),
          lock: jest.fn(
            () => ({ acquired: false, release: lockRelease } as any)
          ),
          set: jest.fn(),
          isValidId: jest.fn(id => id === "valid"),
          generateId: jest.fn()
        };
        let req = createRequest(sessions, cookieName, cookie);

        const authConfig = { auth: true } as any;
        let enhancedReq = enhanceRequestWithUser(
          req,
          cookieName,
          cookie,
          sessions,
          authConfig,
          {} as any,
          0
        );

        const user = await enhancedReq.user.get();
        expect(user).not.toBe(null);

        expect(req.session.get).toHaveBeenCalled();
        expect(dateNowSpy).toHaveBeenCalled();
        expect(sessions.lock).toHaveBeenCalledWith("valid", 5000);

        expect(attemptToRefreshToken).not.toHaveBeenCalled();
        expect(sessions.lock).toHaveBeenCalledTimes(1);
        expect(sessions.set).not.toHaveBeenCalled();
        expect(lockRelease).not.toBeCalled();

        expect(user).toMatchSnapshot();

        dateNowSpy.mockRestore();
      });
    });

    it("should return session if no other conditions are matched", async () => {
      const cookie = "valid";

      const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => 1100);

      const session = {
        accessToken: "accessToken",
        idToken: "idToken",
        expires: 1500
      } as any;

      const lockRelease = jest.fn();
      const sessions: SessionManager = {
        client: {} as any,
        delete: jest.fn(),
        get: jest.fn(async () => session),
        has: jest.fn(),
        lock: jest.fn(() => ({ acquired: false, release: lockRelease } as any)),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };
      let req = createRequest(sessions, cookieName, cookie);

      const authConfig = { auth: true } as any;
      let enhancedReq = enhanceRequestWithUser(
        req,
        cookieName,
        cookie,
        sessions,
        authConfig,
        {} as any,
        0
      );

      const user = await enhancedReq.user.get();
      expect(user).not.toBe(null);

      expect(req.session.get).toHaveBeenCalled();
      expect(dateNowSpy).toHaveBeenCalled();

      expect(attemptToRefreshToken).not.toHaveBeenCalled();
      expect(sessions.lock).not.toHaveBeenCalled();
      expect(sessions.set).not.toHaveBeenCalled();
      expect(lockRelease).not.toBeCalled();

      expect(user).toMatchSnapshot();

      dateNowSpy.mockRestore();
    });
  });

  function prepareForDataTests(session: any) {
    const cookie = "valid";

    const lockRelease = jest.fn();
    const sessions: SessionManager = {
      client: {} as any,
      delete: jest.fn(),
      get: jest.fn(async () => session),
      has: jest.fn(),
      lock: jest.fn(() => ({ acquired: false, release: lockRelease } as any)),
      set: jest.fn(),
      isValidId: jest.fn(id => id === "valid"),
      generateId: jest.fn()
    };
    let req = createRequest(sessions, cookieName, cookie);

    const authConfig = { auth: true } as any;
    let enhancedReq = enhanceRequestWithUser(
      req,
      cookieName,
      cookie,
      sessions,
      authConfig,
      {} as any,
      0
    );

    return enhancedReq;
  }

  describe("data methods", () => {
    let dateNowSpy: jest.SpyInstance<number, []>;

    beforeEach(() => {
      dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => 1100);
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    describe(".userInfo", () => {
      it("should return null if user is null", async () => {
        const session = null;

        const req = prepareForDataTests(session);

        const data = await req.user.userInfo();
        expect(getUserInfo).not.toBeCalled();
        expect(data).toBe(null);
      });

      it("should return correctly if user is not null", async () => {
        const session = {
          accessToken: "accessToken",
          idToken: "idToken",
          expires: 1500
        } as any;

        const req = prepareForDataTests(session);

        const data = await req.user.userInfo();
        expect(getUserInfo).toBeCalled();
        expect(data).toBe("getUserInfo");
      });
    });

    describe(".fullUserData", () => {
      it("should return null if user is null", async () => {
        const session = null;

        const req = prepareForDataTests(session);

        const data = await req.user.fullUserData();
        expect(getManagementUserInfo).not.toBeCalled();
        expect(data).toBe(null);
      });

      it("should return correctly if user is not null", async () => {
        const session = {
          accessToken: "accessToken",
          idToken: "idToken",
          expires: 1500
        } as any;

        const req = prepareForDataTests(session);

        const data = await req.user.fullUserData();
        expect(getManagementUserInfo).toBeCalled();
        expect(data).toBe("getManagementUserInfo");
      });
    });

    describe(".roles", () => {
      it("should return null if user is null", async () => {
        const session = null;

        const req = prepareForDataTests(session);

        const data = await req.user.roles();
        expect(getManagementUserRoles).not.toBeCalled();
        expect(data).toBe(null);
      });

      it("should return correctly if user is not null", async () => {
        const session = {
          accessToken: "accessToken",
          idToken: "idToken",
          expires: 1500
        } as any;

        const req = prepareForDataTests(session);

        const data = await req.user.roles();
        expect(getManagementUserRoles).toBeCalled();
        expect(data).toBe("getManagementUserRoles");
      });
    });

    describe(".permissions", () => {
      it("should return null if user is null", async () => {
        const session = null;

        const req = prepareForDataTests(session);

        const data = await req.user.permissions();
        expect(getManagementUserPermissions).not.toBeCalled();
        expect(data).toBe(null);
      });

      it("should return correctly if user is not null", async () => {
        const session = {
          accessToken: "accessToken",
          idToken: "idToken",
          expires: 1500
        } as any;

        const req = prepareForDataTests(session);

        const data = await req.user.permissions();
        expect(getManagementUserPermissions).toBeCalled();
        expect(data).toBe("getManagementUserPermissions");
      });
    });
  });
});
