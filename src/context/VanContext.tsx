/* oxlint-disable react/only-export-components -- Context types, constants and hook intentionally share this module. */
import React, { createContext, useContext, useState, useEffect } from "react";
import { api, apiStatus, type DataMode } from "../services/api";
import { vehicleCapacity } from "../utils/vehicle";
import type {
  Booking,
  Driver,
  SessionUser,
  SystemNotification,
  Transaction,
  UserProfile,
  Van,
} from "../types/domain";
export type {
  Booking,
  Driver,
  DriverReview,
  SessionUser,
  SystemNotification,
  Transaction,
  UserProfile,
  UserRole,
  Van,
} from "../types/domain";

export const BOARDING_POINTS = [
  "สถานีขนส่งผู้โดยสารกรุงเทพฯ (หมอชิต 2)",
  "สถานีขนส่งเอกมัย (Ekkamai)",
  "สถานีขนส่งผู้โดยสารสายใต้ใหม่ (Southern Bus Terminal)",
  "จุดจอดรถตู้รังสิต (Rangsit)",
];
const OTP_VERIFIED_SESSION_KEY = "everyvan_otp_verified_token";

interface VanContextType {
  // Session Auth State
  currentUser: SessionUser | null;
  pendingOtpUser: SessionUser | null;
  token: string | null;
  dataMode: DataMode;
  login: (username: string, password: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cancelOtp: () => Promise<void>;
  logout: () => Promise<void>;
  registerUser: (
    username: string,
    password: string,
    role: SessionUser["role"],
    profile: UserProfile,
  ) => Promise<void>;
  updateUserProfile: (updatedProfile: UserProfile) => Promise<void>;
  changeOwnPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;

  // Database States
  drivers: Driver[];
  vans: Van[];
  bookings: Booking[];
  transactions: Transaction[];
  notifications: SystemNotification[];
  boardingPoints: string[];

  // Utility Actions
  addNotification: (message: string, type: SystemNotification["type"]) => void;
  markNotificationsAsRead: () => void;
  bookTicket: (
    vanId: string,
    seatNo: number,
    boardingPoint: string,
    dropOffPoint: string,
    date: string,
  ) => Promise<Booking>;
  confirmPayment: (bookingId: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  updateVanStatus: (
    vanId: string,
    status: Van["status"],
    report?: string,
    incidentType?: "breakdown" | "accident",
  ) => Promise<void>;
  updateDepartureTime: (vanId: string, newTime: string) => Promise<void>;
  updateArrivalTime: (vanId: string, newTime: string) => Promise<void>;
  updateCurrentStop: (vanId: string, currentStop: string) => Promise<void>;
  createVanSchedule: (data: {
    plateNo: string;
    vanType: string;
    capacity: number;
    destination: string;
    dropOffPoints: string[];
    departureTime: string;
    price: number;
    driverId: string;
    date: string;
  }) => Promise<void>;
  addReview: (
    driverId: string,
    bookingId: string,
    rating: number,
    comment: string,
  ) => Promise<void>;
  boardPassenger: (bookingId: string) => Promise<boolean>;
  alightPassenger: (bookingId: string) => Promise<boolean>;
  alightPassengersAtStop: (vanId: string, stop: string) => Promise<number>;
  completeTrip: (vanId: string) => Promise<void>;
  fastForwardTime: (minutes: number) => void;
}

const VanContext = createContext<VanContextType | undefined>(undefined);

export const VanProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [pendingOtpUser, setPendingOtpUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>(apiStatus.get());

  // DB replication state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => apiStatus.subscribe(setDataMode), []);

  const notificationKey = (username: string) =>
    `everyvan_notifications_${username}`;
  const welcomeNotification = (): SystemNotification => ({
    id: "notif-welcome",
    message: "ยินดีต้อนรับสู่ EveryVan ระบบจองตั๋วรถตู้สำหรับทุกการเดินทาง",
    type: "payment_status",
    timestamp: new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isRead: false,
  });
  const loadLocalNotifications = (username: string): SystemNotification[] => {
    const saved = localStorage.getItem(notificationKey(username));
    if (!saved) return [welcomeNotification()];
    try {
      return JSON.parse(saved) as SystemNotification[];
    } catch {
      return [welcomeNotification()];
    }
  };

  // Sync Notifications
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        notificationKey(currentUser.username),
        JSON.stringify(notifications),
      );
    }
  }, [currentUser, notifications]);

  // Load session & initial DB data
  const refreshDatabase = async (role = currentUser?.role) => {
    try {
      const [v, d] = await Promise.all([api.vans.list(), api.drivers.list()]);
      const [b, t, n] = await Promise.all([
        role ? api.bookings.list() : Promise.resolve([]),
        role && ["accountant", "staff", "dispatcher", "admin"].includes(role)
          ? api.transactions.list()
          : Promise.resolve([]),
        role ? api.notifications.list().catch(() => []) : Promise.resolve([]),
      ]);

      setVans(v);
      setBookings(b);
      setTransactions(t);
      setDrivers(d);
      if (n.length)
        setNotifications(
          n.map((item: any) => ({
            id: String(item.notification_id),
            message: item.message,
            type:
              item.notification_type === "departure"
                ? "departure"
                : item.notification_type === "incident"
                  ? "accident"
                  : item.notification_type === "schedule_change"
                    ? "schedule_change"
                    : "payment_status",
            timestamp: new Date(item.created_at).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isRead: item.is_read,
          })),
        );
    } catch (err) {
      console.error("Failed to sync API database states", err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const session = await api.auth.getSession();
      if (session) {
        setToken(session.token);
        if (sessionStorage.getItem(OTP_VERIFIED_SESSION_KEY) === session.token) {
          setCurrentUser(session.user);
          setNotifications(loadLocalNotifications(session.user.username));
          await refreshDatabase(session.user.role);
        } else {
          setPendingOtpUser(session.user);
        }
      } else {
        await refreshDatabase();
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // Poll frequently so released seats are reflected for every open client.
    const interval = setInterval(refreshDatabase, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Expiry checks: runs auto-cancel cleaner locally (synced via API wrapper calls)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const now = Date.now();
        let updated = false;
        const activeBookings = await api.bookings.list();
        for (const b of activeBookings) {
          if (b.status === "Pending Payment" && now > b.unpaidExpiresAt) {
            await api.bookings.cancel(b.id);
            updated = true;
          }
        }

        if (updated) {
          await refreshDatabase();
          addNotification(
            "การจองตั๋วบางรายการถูกยกเลิกโดยอัตโนมัติเนื่องจากไม่ได้รับการชำระเงินภายใน 5 นาที",
            "payment_status",
          );
        }
      } catch (err) {
        console.error("Failed to check booking expiry", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const addNotification = (
    message: string,
    type: SystemNotification["type"],
  ) => {
    const newNotif: SystemNotification = {
      id: "notif-" + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    api.notifications.markRead().catch(() => undefined);
  };

  // Auth Operations
  const login = async (username: string, password: string) => {
    const res = await api.auth.login(username, password);
    sessionStorage.removeItem(OTP_VERIFIED_SESSION_KEY);
    setToken(res.token);
    setPendingOtpUser(res.user);
  };

  const verifyOtp = async (code: string) => {
    if (!pendingOtpUser) throw new Error("ไม่พบรายการยืนยันตัวตน");
    if (!/^\d+$/.test(code)) throw new Error("กรุณากรอกรหัส OTP เป็นตัวเลข");
    if (token) sessionStorage.setItem(OTP_VERIFIED_SESSION_KEY, token);
    setCurrentUser(pendingOtpUser);
    setNotifications(loadLocalNotifications(pendingOtpUser.username));
    await refreshDatabase(pendingOtpUser.role);
    addNotification(
      `ยืนยัน OTP และเข้าสู่ระบบในชื่อคุณ ${pendingOtpUser.profile.name} สำเร็จ`,
      "payment_status",
    );
    setPendingOtpUser(null);
  };

  const cancelOtp = async () => {
    await api.auth.logout();
    sessionStorage.removeItem(OTP_VERIFIED_SESSION_KEY);
    setToken(null);
    setPendingOtpUser(null);
  };

  const logout = async () => {
    await api.auth.logout();
    sessionStorage.removeItem(OTP_VERIFIED_SESSION_KEY);
    setToken(null);
    setCurrentUser(null);
    setPendingOtpUser(null);
    setNotifications([]);
  };

  const registerUser = async (
    username: string,
    password: string,
    role: SessionUser["role"],
    profile: UserProfile,
  ) => {
    await api.auth.register({ username, password, role, profile });
    addNotification(
      `สมัครสมาชิกบัญชีผู้ใช้ใหม่สำเร็จ! กรุณาเข้าสู่ระบบ`,
      "payment_status",
    );
  };

  const updateUserProfile = async (updatedProfile: UserProfile) => {
    if (!currentUser) return;
    const res = await api.auth.updateProfile(
      currentUser.username,
      updatedProfile,
    );
    setCurrentUser((prev) => (prev ? { ...prev, profile: res } : null));
    addNotification("ปรับปรุงข้อมูลส่วนตัวเรียบร้อยแล้ว", "payment_status");
  };

  const changeOwnPassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    await api.auth.changePassword(currentPassword, newPassword);
    addNotification("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", "payment_status");
  };

  // Ticket Booking Operations
  const bookTicket = async (
    vanId: string,
    seatNo: number,
    boardingPoint: string,
    dropOffPoint: string,
    date: string,
  ) => {
    if (!currentUser) throw new Error("กรุณาเข้าสู่ระบบก่อนทำการจอง");
    const newBooking = await api.bookings.create(
      vanId,
      seatNo,
      boardingPoint,
      dropOffPoint,
      date,
      currentUser.profile,
    );
    await refreshDatabase();

    const van = vans.find((v) => v.id === vanId);
    setTimeout(() => {
      addNotification(
        `รถตู้สาย ${van?.destination} ใกล้ถึงเวลาออกเดินทางแล้ว! จุดขึ้นรถ: ${boardingPoint}`,
        "departure",
      );
    }, 15000);

    return newBooking;
  };

  const confirmPayment = async (bookingId: string) => {
    await api.bookings.pay(bookingId);
    await refreshDatabase();

    const b = bookings.find((item) => item.id === bookingId);
    const van = vans.find((v) => v.id === b?.vanId);
    addNotification(
      `ยืนยันการจ่ายเงินของตั๋ว ${bookingId} ปลายทาง ${van?.destination || ""} เรียบร้อย`,
      "payment_status",
    );
  };

  const cancelBooking = async (bookingId: string) => {
    await api.bookings.cancel(bookingId);
    await refreshDatabase();
    addNotification(`ยกเลิกการจองตั๋ว ${bookingId} สำเร็จ`, "payment_status");
  };

  const updateVanStatus = async (
    vanId: string,
    status: Van["status"],
    report?: string,
    incidentType: "breakdown" | "accident" = "breakdown",
  ) => {
    if (status === "Accident" && report) {
      await api.vans.reportIncident(vanId, report, incidentType);
    } else {
      await api.vans.updateStatus(vanId, status, report);
    }
    await refreshDatabase();

    const van = vans.find((v) => v.id === vanId);
    if (!van) return;
    if (status === "Accident") {
      addNotification(
        `[แจ้งด่วน] รถตู้ทะเบียน ${van.plateNo} ${
          incidentType === "accident" ? "เกิดอุบัติเหตุ" : "เกิดเหตุขัดข้อง"
        }: ${report}`,
        "accident",
      );
    } else {
      addNotification(
        `รถตู้ทะเบียน ${van.plateNo} อัปเดตสถานะเป็น: ${status}`,
        "schedule_change",
      );
    }
  };

  const updateDepartureTime = async (vanId: string, newTime: string) => {
    await api.vans.updateDepartureTime(vanId, newTime);
    await refreshDatabase();

    const van = vans.find((v) => v.id === vanId);
    if (van) {
      addNotification(
        `[ปรับเปลี่ยนตารางเวลา] รถตู้ทะเบียน ${van.plateNo} ปลายทาง ${van.destination} เลื่อนเวลาเดินทางเป็น ${newTime} น.`,
        "schedule_change",
      );
    }
  };

  const updateArrivalTime = async (vanId: string, newTime: string) => {
    await api.vans.updateArrivalTime(vanId, newTime);
    await refreshDatabase();
    const van = vans.find((v) => v.id === vanId);
    if (van)
      addNotification(
        `ปรับเวลาเข้าถึงปลายทางของรถ ${van.plateNo} เป็น ${newTime} น.`,
        "schedule_change",
      );
  };
  const updateCurrentStop = async (vanId: string, currentStop: string) => {
    await api.vans.updateLocation(vanId, currentStop);
    await refreshDatabase();
    addNotification(`รถอัปเดตจุดล่าสุด: ${currentStop}`, "schedule_change");
  };

  const createVanSchedule = async (data: {
    plateNo: string;
    vanType: string;
    capacity: number;
    destination: string;
    dropOffPoints: string[];
    departureTime: string;
    price: number;
    driverId: string;
    date: string;
  }) => {
    await api.vans.create({
      destination: data.destination,
      drop_off_points: data.dropOffPoints,
      departure_time: `${data.date}T${data.departureTime}:00+07:00`,
      vehicle_type: data.vanType,
      license_plate: data.plateNo,
      total_seats: vehicleCapacity(data.vanType),
      driver_id: Number(data.driverId),
      price: data.price,
    });
    await refreshDatabase();
    addNotification(
      `เพิ่มตารางเดินรถใหม่: ${data.destination} เวลา ${data.departureTime} น. วันที่ ${data.date}`,
      "schedule_change",
    );
  };

  const addReview = async (
    driverId: string,
    bookingId: string,
    rating: number,
    comment: string,
  ) => {
    if (!currentUser) return;
    await api.drivers.submitReview(
      driverId,
      bookingId,
      rating,
      comment,
      currentUser.profile.name,
    );
    await refreshDatabase();
    addNotification("ส่งข้อมูลรีวิวและให้คะแนนเสร็จสิ้น", "payment_status");
  };

  const boardPassenger = async (bookingId: string): Promise<boolean> => {
    try {
      await api.bookings.board(bookingId);
      await refreshDatabase();
      const b = bookings.find((item) => item.id === bookingId);
      if (b) {
        addNotification(
          `ผู้โดยสาร ${b.passengerName} เช็คอินขึ้นรถเรียบร้อยแล้ว`,
          "departure",
        );
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const alightPassenger = async (bookingId: string): Promise<boolean> => {
    try {
      await api.bookings.alight(bookingId);
      await refreshDatabase();
      const b = bookings.find((item) => item.id === bookingId);
      if (b) {
        addNotification(
          `ผู้โดยสาร ${b.passengerName} ลงระหว่างทางแล้ว ที่นั่ง ${b.seatNo} ว่างแล้ว`,
          "schedule_change",
        );
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const alightPassengersAtStop = async (vanId: string, stop: string) => {
    const result = await api.bookings.alightStop(vanId, stop);
    await refreshDatabase();
    addNotification(`ยืนยันส่งผู้โดยสารลงที่ ${stop} แล้ว ${result.count} คน`, "departure");
    return result.count;
  };

  const completeTrip = async (vanId: string) => {
    await api.vans.completeTrip(vanId);
    await refreshDatabase();
    const van = vans.find((v) => v.id === vanId);
    if (van) {
      addNotification(
        `รถตู้ทะเบียน ${van.plateNo} เสร็จสิ้นเส้นทางเดินรถและส่งผู้โดยสารปลายทางแล้ว`,
        "departure",
      );
    }
  };

  const fastForwardTime = (minutes: number) => {
    // Fast forward LocalStorage timers for testing timeout
    const msToSubtract = minutes * 60 * 1000;
    const bList = JSON.parse(localStorage.getItem("everyvan_bookings") || "[]");
    const updated = bList.map((b: Booking) => {
      if (b.status === "Pending Payment") {
        return {
          ...b,
          unpaidExpiresAt: b.unpaidExpiresAt - msToSubtract,
        };
      }
      return b;
    });
    localStorage.setItem("everyvan_bookings", JSON.stringify(updated));
    refreshDatabase();
    addNotification(
      `เร่งเวลาจำลองไปข้างหน้า ${minutes} นาที`,
      "payment_status",
    );
  };

  return (
    <VanContext.Provider
      value={{
        currentUser,
        pendingOtpUser,
        token,
        dataMode,
        login,
        verifyOtp,
        cancelOtp,
        logout,
        registerUser,
        updateUserProfile,
        changeOwnPassword,
        drivers,
        vans,
        bookings,
        transactions,
        notifications,
        boardingPoints: BOARDING_POINTS,
        addNotification,
        markNotificationsAsRead,
        bookTicket,
        confirmPayment,
        cancelBooking,
        updateVanStatus,
        updateDepartureTime,
        updateArrivalTime,
        updateCurrentStop,
        createVanSchedule,
        addReview,
        boardPassenger,
        alightPassenger,
        alightPassengersAtStop,
        completeTrip,
        fastForwardTime,
      }}
    >
      {children}
    </VanContext.Provider>
  );
};

export const useVan = () => {
  const context = useContext(VanContext);
  if (context === undefined) {
    throw new Error("useVan must be used within a VanProvider");
  }
  return context;
};
