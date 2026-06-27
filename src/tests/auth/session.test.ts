import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const createMock = vi.fn();
const findOneMock = vi.fn();
const deleteOneMock = vi.fn();

vi.mock("@/lib/models/AdminSession", () => ({
  AdminSession: {
    create: createMock,
    findOne: findOneMock,
    deleteOne: deleteOneMock,
  },
}));

const {
  createSession,
  getSession,
  destroySession,
  getSessionCookieOptions,
  SESSION_COOKIE,
} = await import("@/lib/auth/session");

describe("SESSION_COOKIE", () => {
  it("es lv_sid", () => {
    expect(SESSION_COOKIE).toBe("lv_sid");
  });
});

describe("createSession", () => {
  it("crea sesión y retorna token y maxAge", async () => {
    createMock.mockResolvedValue({ token: "abc123" });

    const result = await createSession();

    expect(result).toHaveProperty("token");
    expect(result.token.length).toBe(64); // 32 bytes hex
    expect(result.maxAge).toBe(60 * 60 * 24 * 7);
    expect(createMock).toHaveBeenCalledOnce();
    expect(createMock).toHaveBeenCalledWith({ token: result.token });
  });
});

describe("getSession", () => {
  it("retorna sesión cuando token existe", async () => {
    findOneMock.mockReturnValue({ lean: () => Promise.resolve({ _id: "abc" }) });

    const session = await getSession("valid-token-here-1234");
    expect(session).toEqual({ id: "abc" });
  });

  it("retorna null si token es muy corto", async () => {
    const session = await getSession("short");
    expect(session).toBeNull();
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("retorna null si token es vacío", async () => {
    const session = await getSession("");
    expect(session).toBeNull();
  });

  it("retorna null si sesión no existe en DB", async () => {
    findOneMock.mockReturnValue({ lean: () => Promise.resolve(null) });

    const session = await getSession("valid-token-here-1234");
    expect(session).toBeNull();
  });
});

describe("destroySession", () => {
  it("elimina sesión por token", async () => {
    deleteOneMock.mockResolvedValue({ deletedCount: 1 });

    await destroySession("token-to-delete");
    expect(deleteOneMock).toHaveBeenCalledWith({ token: "token-to-delete" });
  });

  it("no llama DB si token es vacío", async () => {
    await destroySession("");
    expect(deleteOneMock).not.toHaveBeenCalled();
  });

  it("no llama DB si token es nullish", async () => {
    await destroySession("");
    expect(deleteOneMock).not.toHaveBeenCalled();
  });
});

describe("getSessionCookieOptions", () => {
  it("retorna opciones para desarrollo", () => {
    const opts = getSessionCookieOptions(false);
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/admin",
    });
    expect(opts.maxAge).toBe(60 * 60 * 24 * 7);
  });

  it("retorna secure: true en producción", () => {
    const opts = getSessionCookieOptions(true);
    expect(opts.secure).toBe(true);
  });

  it("retorna secure: false en desarrollo", () => {
    const opts = getSessionCookieOptions(false);
    expect(opts.secure).toBe(false);
  });
});
