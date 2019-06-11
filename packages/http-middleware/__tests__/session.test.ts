import { enhanceRequestWithSession } from "../session";
import { SessionManager } from "@nyckel/sessions";

describe("enhanceRequestWithSession", () => {
  it("should enhance a request correctly", () => {
    let req = {};

    const setCookie = jest.fn();
    const clearCookie = jest.fn();

    let enhancedReq = enhanceRequestWithSession(
      req,
      "cookieName",
      "cookie",
      {} as any,
      setCookie,
      clearCookie
    );

    expect(enhancedReq.session).toBeDefined();
    expect(typeof enhancedReq.session.set).toBe("function");
    expect(typeof enhancedReq.session.get).toBe("function");
    expect(typeof enhancedReq.session.delete).toBe("function");
    expect(enhancedReq.session).toMatchSnapshot();

    expect(setCookie).not.toHaveBeenCalled();
    expect(clearCookie).not.toHaveBeenCalled();
  });

  const cookieName = "cookieName";

  describe(".set", () => {
    it("should generate an id if the provided cookie is invalid", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn(() => "generated")
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "cookie",
        sessions,
        setCookie,
        clearCookie
      );

      let data = { test: "" };
      await enhancedReq.session.set(data);
      expect(setCookie).toHaveBeenCalledWith(cookieName, "generated");
      expect(clearCookie).not.toHaveBeenCalled();
      expect(sessions.generateId).toHaveBeenCalled();
      expect(sessions.set).toHaveBeenCalledWith("generated", data);
    });

    it("should not generate an id if the provided cookie is valid", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn(() => "generated")
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "valid",
        sessions,
        setCookie,
        clearCookie
      );

      let data = { test: "" };
      await enhancedReq.session.set(data);
      expect(setCookie).toHaveBeenCalledWith(cookieName, "valid");
      expect(clearCookie).not.toHaveBeenCalled();
      expect(sessions.generateId).not.toHaveBeenCalled();
      expect(sessions.set).toHaveBeenCalledWith("valid", data);
    });
  });

  describe(".get", () => {
    it("should return empty object if the provided cookie is invalid", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "invalid",
        sessions,
        setCookie,
        clearCookie
      );

      const data = await enhancedReq.session.get();
      expect(data).toEqual({});

      expect(sessions.get).not.toHaveBeenCalled();

      type T = string | null;
      expect(setCookie).not.toHaveBeenCalled();
      expect(clearCookie).not.toHaveBeenCalled();
    });

    it("should return empty object if the session state is invalid", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn((async () => null) as any),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "valid",
        sessions,
        setCookie,
        clearCookie
      );

      const data = await enhancedReq.session.get();
      expect(data).toEqual({});

      expect(sessions.get).toHaveBeenCalledWith("valid");

      expect(setCookie).not.toHaveBeenCalled();
      expect(clearCookie).not.toHaveBeenCalled();
    });

    it("should return the session object if it's truthy", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn(async id => ({ id, data: "yes" } as any)),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "valid",
        sessions,
        setCookie,
        clearCookie
      );

      const data = await enhancedReq.session.get();
      expect(data).toEqual({ id: "valid", data: "yes" });

      expect(sessions.get).toHaveBeenCalledWith("valid");

      expect(setCookie).not.toHaveBeenCalled();
      expect(clearCookie).not.toHaveBeenCalled();
    });
  });

  describe(".delete", () => {
    it("should do nothing the provided cookie is invalid", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "invalid",
        sessions,
        setCookie,
        clearCookie
      );

      await enhancedReq.session.delete();
      expect(sessions.delete).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
      expect(clearCookie).not.toHaveBeenCalled();
    });

    it("should work correctly if the provided cookie is valid", async () => {
      const sessions: SessionManager = {
        delete: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        lock: jest.fn(),
        set: jest.fn(),
        isValidId: jest.fn(id => id === "valid"),
        generateId: jest.fn()
      };

      const setCookie = jest.fn();
      const clearCookie = jest.fn();

      let enhancedReq = enhanceRequestWithSession(
        {},
        cookieName,
        "valid",
        sessions,
        setCookie,
        clearCookie
      );

      await enhancedReq.session.delete();
      expect(sessions.delete).toHaveBeenCalledWith("valid");
      expect(setCookie).not.toHaveBeenCalled();
      expect(clearCookie).toHaveBeenCalledWith(cookieName);
    });
  });
});
