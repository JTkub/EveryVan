// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VanProvider, useVan } from "../context/VanContext";
import { AuthView } from "./AuthView";
import type { SessionUser } from "../types/domain";

const mocks = vi.hoisted(() => ({
  login: vi.fn(), getSession: vi.fn(), logout: vi.fn(),
  vans: vi.fn(), drivers: vi.fn(), bookings: vi.fn(),
  transactions: vi.fn(), notifications: vi.fn(),
}));
vi.mock("../services/api", () => ({
  apiStatus: { get: () => "online", subscribe: () => () => undefined },
  api: {
    auth: { login: mocks.login, getSession: mocks.getSession, logout: mocks.logout },
    vans: { list: mocks.vans }, drivers: { list: mocks.drivers },
    bookings: { list: mocks.bookings }, transactions: { list: mocks.transactions },
    notifications: { list: mocks.notifications },
  },
}));

const user: SessionUser = {
  username: "pax", role: "passenger",
  profile: { name: "Passenger", phone: "0800000000", email: "pax@example.test", dob: "", thaiId: "" },
};
const session = { token: "valid-server-session", user };
let auth: ReturnType<typeof useVan>;
let host: HTMLDivElement;
let root: Root;

function Screen() {
  auth = useVan();
  return auth.currentUser ? <p>Dashboard</p> : <AuthView />;
}
const mount = async () => {
  root = createRoot(host);
  await act(async () => root.render(<VanProvider><Screen /></VanProvider>));
};
const login = async () => {
  await act(async () => auth.login("pax", "correct-password"));
};

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  sessionStorage.clear();
  vi.resetAllMocks();
  mocks.login.mockResolvedValue(session);
  mocks.getSession.mockResolvedValue(null);
  mocks.logout.mockResolvedValue(undefined);
  for (const mock of [mocks.vans, mocks.drivers, mocks.bookings, mocks.transactions, mocks.notifications]) {
    mock.mockResolvedValue([]);
  }
  host = document.createElement("div");
  document.body.append(host);
  await mount();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("Login OTP flow", () => {
  it("waits for OTP after a valid server login without claiming an SMS was sent", async () => {
    await login();
    expect(auth.currentUser).toBeNull();
    expect(auth.pendingOtpUser).toEqual(user);
    expect(mocks.bookings).not.toHaveBeenCalled();
    expect(host.querySelector("#otp-code")).not.toBeNull();
    expect(host.textContent).not.toMatch(/demo|โหมดทดสอบ|ส่งรหัส|TWO-FACTOR/i);
  });

  it.each(["000000", "123456", "987654"])("accepts arbitrary six-digit code %s", async (code) => {
    await login();
    await act(async () => auth.verifyOtp(code));
    expect(auth.currentUser).toEqual(user);
    expect(auth.pendingOtpUser).toBeNull();
    expect(host.textContent).toBe("Dashboard");
    expect(mocks.bookings).toHaveBeenCalled();
  });

  it("rejects missing, short, long or nonnumeric codes without opening the dashboard", async () => {
    await login();
    for (const code of ["", "12345", "1234567", "abcdef", "12345a", " 123456", "１２３４５６"]) {
      await act(async () => {
        await expect(auth.verifyOtp(code)).rejects.toThrow("6 หลัก");
      });
      expect(auth.currentUser).toBeNull();
    }
    expect(mocks.bookings).not.toHaveBeenCalled();
  });

  it("limits input to six digits and keeps confirm disabled until it is complete", async () => {
    await login();
    const input = host.querySelector<HTMLInputElement>("#otp-code")!;
    const confirm = host.querySelector<HTMLButtonElement>("button[type='submit'], .auth-submit")!;
    const enter = async (value: string) => act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await enter("12345");
    expect(confirm.disabled).toBe(true);
    await enter("00a123456");
    expect(input.value).toBe("001234");
    expect(confirm.disabled).toBe(false);
    expect(input.checkValidity()).toBe(true);
    await act(async () => {
      input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(host.textContent).toBe("Dashboard");
  });

  it("requires OTP again after reloading an unverified server session", async () => {
    await login();
    await act(async () => root.unmount());
    mocks.getSession.mockResolvedValue(session);
    await mount();
    expect(auth.currentUser).toBeNull();
    expect(host.querySelector("#otp-code")).not.toBeNull();
  });

  it("keeps a verified session after reload and returns to login when OTP is cancelled", async () => {
    await login();
    await act(async () => auth.verifyOtp("000000"));
    await act(async () => root.unmount());
    mocks.getSession.mockResolvedValue(session);
    await mount();
    expect(host.textContent).toBe("Dashboard");
    await act(async () => auth.logout());
    await login();
    const cancel = host.querySelector<HTMLButtonElement>(".otp-cancel")!;
    await act(async () => cancel.click());
    expect(auth.currentUser).toBeNull();
    expect(auth.pendingOtpUser).toBeNull();
    expect(auth.token).toBeNull();
    expect(host.querySelector("#otp-code")).toBeNull();
    expect(mocks.logout).toHaveBeenCalledTimes(2);
  });

  it("still rejects invalid username and password before showing OTP", async () => {
    mocks.login.mockRejectedValue(new Error("Invalid credentials"));
    await act(async () => {
      await expect(auth.login("pax", "wrong-password")).rejects.toThrow("Invalid credentials");
    });
    expect(auth.pendingOtpUser).toBeNull();
    expect(auth.currentUser).toBeNull();
    expect(host.querySelector("#otp-code")).toBeNull();
  });
});
