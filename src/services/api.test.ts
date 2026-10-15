// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("API requires the real server", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("keeps both pickup and drop-off from the booking response for ticket and driver views", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ bookings: [{
      booking_id: 1, trip_id: 2, seat_number: "3", boarding_point: "บางนา",
      alighting_point: "พัทยา", booking_status: "paid",
    }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const { api } = await import("./api");
    const [booking] = await api.bookings.list();
    expect(booking).toMatchObject({ boardingPoint: "บางนา", dropOffPoint: "พัทยา", seatNo: 3, status: "Paid" });
  });

  it("reports an unavailable database without creating demo data", async () => {
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
    await expect(api.vans.list()).rejects.toThrow("database unavailable");
    expect(apiStatus.get()).toBe("offline");
    expect(localStorage.length).toBe(0);
  });

  it("does not log in locally when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    const { api } = await import("./api");
    await expect(api.auth.login("admin", "admin")).rejects.toThrow("ไม่สามารถเชื่อมต่อ API ได้");
    expect(localStorage.getItem("everyvan_api_session")).toBeNull();
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
