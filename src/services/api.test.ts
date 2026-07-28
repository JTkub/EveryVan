// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("API fallback policy", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("uses visible offline data when PostgreSQL/API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "database unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { api, apiStatus } = await import("./api");
    const vans = await api.vans.list();
    expect(vans.length).toBeGreaterThan(0);
    expect(apiStatus.get()).toBe("offline");
  });

  it("does not hide an unexpected server defect behind demo data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "unexpected defect" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { api } = await import("./api");
    await expect(api.vans.list()).rejects.toThrow("unexpected defect");
  });

  it("clears an expired session without surfacing a console error", async () => {
    localStorage.setItem(
      "everyvan_api_session",
      JSON.stringify({
        token: "expired-token",
        user: {
          username: "pax",
          role: "passenger",
          profile: {},
        },
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { api, apiStatus } = await import("./api");
    await expect(api.auth.getSession()).resolves.toBeNull();
    expect(localStorage.getItem("everyvan_api_session")).toBeNull();
    expect(apiStatus.get()).toBe("online");
  });
});
