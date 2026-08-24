import type {
  UserProfile,
  Booking,
  Van,
  Driver,
  Transaction,
  UserRole,
  ManagedUser,
  EmployeeAccountInput,
  ManagedAccountUpdateInput,
} from "../types/domain";
import { vehicleCapacity } from "../utils/vehicle";

const BASE = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");
const SESSION_KEY = "everyvan_api_session";
const KEYS = {
  users: "everyvan_demo_users",
  vans: "everyvan_demo_vans",
  bookings: "everyvan_demo_bookings",
  drivers: "everyvan_demo_drivers",
  notifications: "everyvan_demo_notifications",
};
type Session = {
  token: string;
  user: { username: string; role: UserRole; profile: UserProfile };
};
class ApiUnavailable extends Error {}
class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}
export type DataMode = "checking" | "online" | "offline";
let dataMode: DataMode = "checking";
const modeListeners = new Set<(mode: DataMode) => void>();
const setDataMode = (mode: DataMode) => {
  if (dataMode === mode) return;
  dataMode = mode;
  modeListeners.forEach((listener) => listener(mode));
};
export const apiStatus = {
  get: () => dataMode,
  subscribe: (listener: (mode: DataMode) => void) => {
    modeListeners.add(listener);
    return () => {
      modeListeners.delete(listener);
    };
  },
};

const read = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
};
const write = <T>(key: string, value: T) =>
  localStorage.setItem(key, JSON.stringify(value));
const getSession = (): Session | null =>
  read<Session | null>(SESSION_KEY, null);
const saveSession = (session: Session | null) =>
  session ? write(SESSION_KEY, session) : localStorage.removeItem(SESSION_KEY);
const bangkokDate = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
};
const bangkokTime = (value: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);

function seedDemo() {
  const today = bangkokDate();
  if (!localStorage.getItem(KEYS.users)) {
    write(KEYS.users, [
      {
        username: "pax",
        password: "pax",
        role: "passenger",
        profile: {
          name: "รัชพล ทองอินทร์",
          dob: "1998-04-12",
          phone: "0829998877",
          email: "ratchapol@everyvan.com",
          thaiId: "1234567890123",
        },
      },
      {
        username: "driver",
        password: "driver",
        role: "driver",
        profile: {
          name: "สมชาย ศรีชัย",
          dob: "1982-08-20",
          phone: "0812345678",
          email: "somchai@everyvan.com",
          thaiId: "",
        },
      },
      {
        username: "staff",
        password: "staff",
        role: "staff",
        profile: {
          name: "นารี จัดคิว",
          dob: "1991-06-11",
          phone: "0811111111",
          email: "staff@everyvan.com",
          thaiId: "",
        },
      },
      {
        username: "accountant",
        password: "accountant",
        role: "accountant",
        profile: {
          name: "พิมพ์ชนก บัญชี",
          dob: "1990-03-24",
          phone: "0822222222",
          email: "accountant@everyvan.com",
          thaiId: "",
        },
      },
      {
        username: "admin",
        password: "admin",
        role: "admin",
        profile: {
          name: "ภูดาเนตร ศิลาอาจ",
          dob: "1992-10-15",
          phone: "0851112233",
          email: "admin@everyvan.com",
          thaiId: "",
        },
      },
    ]);
  }
  if (!localStorage.getItem(KEYS.drivers)) {
    write(KEYS.drivers, [
      {
        id: "1",
        name: "สมชาย ศรีชัย",
        avatar: "/driver-somchai.png",
        licenseNo: "DL-100245",
        phone: "0812345678",
        rating: 4.9,
        reviews: [],
      },
      {
        id: "2",
        name: "วิชัย ใจดี",
        avatar: "/driver-wichai.png",
        licenseNo: "DL-100318",
        phone: "0823456789",
        rating: 4.8,
        reviews: [],
      },
      {
        id: "3",
        name: "สมศักดิ์ มั่นคง",
        avatar: "/driver-somsak.png",
        licenseNo: "DL-100422",
        phone: "0834567890",
        rating: 4.7,
        reviews: [],
      },
    ] as Driver[]);
  }
  if (!localStorage.getItem(KEYS.vans)) {
    write(KEYS.vans, [
      {
        id: "1",
        plateNo: "10-2301 กรุงเทพฯ",
        vanType: "Toyota Commuter",
        capacity: 14,
        status: "Waiting",
        destination: "พัทยา",
        departureTime: "08:30",
        price: 220,
        driverId: "1",
        occupiedSeats: [2, 7],
        date: today,
      },
      {
        id: "2",
        plateNo: "10-2302 กรุงเทพฯ",
        vanType: "Toyota Commuter Premium",
        capacity: 10,
        status: "Waiting",
        destination: "หัวหิน",
        departureTime: "10:00",
        price: 280,
        driverId: "2",
        occupiedSeats: [1, 4, 9],
        date: today,
      },
      {
        id: "3",
        plateNo: "10-2303 กรุงเทพฯ",
        vanType: "Toyota Commuter",
        capacity: 14,
        status: "Waiting",
        destination: "ระยอง",
        departureTime: "13:30",
        price: 240,
        driverId: "3",
        occupiedSeats: [3],
        date: today,
      },
    ] as Van[]);
  } else {
    const capacities: Record<string, number> = {
      "Toyota Commuter": 14,
      "Toyota Commuter Premium": 10,
      "Toyota Commuter VIP": 8,
    };
    const migrated = read<Van[]>(KEYS.vans, []).map((v) => ({
      ...v,
      capacity: capacities[v.vanType] ?? v.capacity,
      date: v.status === "Waiting" && (!v.date || v.date < today) ? today : v.date,
    }));
    write(KEYS.vans, migrated);
  }
  if (!localStorage.getItem(KEYS.bookings))
    write(KEYS.bookings, [] as Booking[]);
  if (!localStorage.getItem(KEYS.notifications))
    write(KEYS.notifications, [] as any[]);
}
seedDemo();
const ensureDemoAccounts = () => {
  const extras = [
    {
      username: "staff",
      password: "staff",
      role: "staff" as const,
      profile: {
        name: "นารี จัดคิว",
        dob: "1991-06-11",
        phone: "0811111111",
        email: "staff@everyvan.com",
        thaiId: "",
      },
    },
    {
      username: "accountant",
      password: "accountant",
      role: "accountant" as const,
      profile: {
        name: "พิมพ์ชนก บัญชี",
        dob: "1990-03-24",
        phone: "0822222222",
        email: "accountant@everyvan.com",
        thaiId: "",
      },
    },
  ];
  const users = read<any[]>(KEYS.users, []);
  write(KEYS.users, [
    ...users,
    ...extras.filter(
      (extra) => !users.some((user) => user.username === extra.username),
    ),
  ]);
};
ensureDemoAccounts();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiUnavailable("ไม่สามารถเชื่อมต่อ API ได้");
  }
  const data = await response.json().catch(() => ({}));
  setDataMode("online");
  if (!response.ok) {
    if (response.status === 503)
      throw new ApiUnavailable(data.error || "API ยังไม่พร้อมใช้งาน");
    throw new ApiRequestError(
      data.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์",
      response.status,
    );
  }
  return data as T;
}
async function fallback<T>(
  online: () => Promise<T>,
  offline: () => T | Promise<T>,
): Promise<T> {
  try {
    return await online();
  } catch (error) {
    if (error instanceof ApiUnavailable) {
      setDataMode("offline");
      return offline();
    }
    throw error;
  }
}
const mapVan = (v: any): Van => ({
  id: String(v.id),
  plateNo: v.plateNo,
  vanType: v.vanType,
  capacity: Number(v.capacity),
  status: v.status,
  destination: v.destination,
  dropOffPoints: v.dropOffPoints || v.drop_off_points || [],
  departureTime: v.departureTime,
  arrivalTime: v.arrivalTime || undefined,
  price: Number(v.price || 220),
  driverId: String(v.driverId),
  occupiedSeats: (v.occupiedSeats || []).map(Number),
  pendingSeats: (v.pendingSeats || []).map(Number),
  date: v.date,
  currentStop: v.currentStop,
  currentStopUpdatedAt: v.currentStopUpdatedAt,
});
const mapDriver = (d: any): Driver => ({
  id: String(d.driver_id ?? d.id),
  name: d.name,
  avatar: d.photo ?? d.avatar ?? "",
  licenseNo: d.license_id ?? d.licenseNo ?? "",
  phone: d.phone ?? "",
  rating: Number(d.rating ?? 5),
  reviews: d.reviews ?? [],
});
const mapBooking = (b: any): Booking => ({
  id: String(b.booking_id ?? b.id),
  vanId: String(b.trip_id ?? b.vanId),
  passengerName: b.passenger_name ?? b.passengerName ?? "",
  passengerPhone: b.phone ?? b.passengerPhone ?? "",
  seatNo: Number(b.seat_number ?? b.seatNo),
  dropOffPoint: b.alighting_point ?? b.dropOffPoint ?? "",
  date: b.departure_time
    ? bangkokDate(new Date(b.departure_time))
    : b.date || "",
  timeSlot: b.departure_time
    ? bangkokTime(new Date(b.departure_time))
    : b.timeSlot || "",
  status:
    (
      {
        pending: "Pending Payment",
        paid: "Paid",
        boarded: "Boarded",
        alighted: "Alighted",
        completed: "Completed",
        cancelled: "Cancelled",
      } as any
    )[b.booking_status] ||
    b.status ||
    "Pending Payment",
  createdAt: Date.parse(b.booking_datetime || "") || Date.now(),
  unpaidExpiresAt: Date.parse(b.expires_at || "") || Date.now() + 300000,
  checkedInAt: b.scanned_at ? Date.parse(b.scanned_at) : undefined,
  ticketId: b.ticket_id ? Number(b.ticket_id) : undefined,
  qrCode: b.qr_code,
  receiptNo: b.receipt_no ?? b.receiptNo,
  amount: b.amount ? Number(b.amount) : undefined,
  destination: b.destination,
  plateNo: b.license_plate ?? b.plateNo,
  driverId:
    b.driver_id !== undefined
      ? String(b.driver_id)
      : b.driverId !== undefined
        ? String(b.driverId)
        : undefined,
  driverName: b.driver_name ?? b.driverName,
  driverPhoto: b.driver_photo ?? b.driverPhoto,
});

const demoVans = () => read<Van[]>(KEYS.vans, []);
const demoBookings = () => read<Booking[]>(KEYS.bookings, []);
const demoDrivers = () => read<Driver[]>(KEYS.drivers, []);
const demoUser = () => getSession()?.user;
const demoManagedUsers = (): ManagedUser[] =>
  read<any[]>(KEYS.users, []).map((user, index) => ({
    id: Number(user.id ?? index + 1),
    username: user.username,
    name: user.profile?.name || user.name || "",
    dob: user.profile?.dob || user.dob || "",
    phone: user.profile?.phone || user.phone || "",
    email: user.profile?.email || user.email || "",
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt || new Date().toISOString(),
    department: user.department || "",
    employeeId: user.employeeId || "",
    licenseId: user.licenseId || "",
    thaiId: user.profile?.thaiId || user.thaiId || "",
  }));
const updateVan = (id: string, update: Partial<Van>) => {
  const vans = demoVans().map((v) => (v.id === id ? { ...v, ...update } : v));
  write(KEYS.vans, vans);
  return vans.find((v) => v.id === id)!;
};

export const api = {
  auth: {
    login: (username: string, password: string) =>
      fallback(
        () =>
          request<Session>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          }).then((s) => {
            saveSession(s);
            return s;
          }),
        () => {
          const user = read<any[]>(KEYS.users, []).find(
            (u) => u.username === username && u.password === password,
          );
          if (!user) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
          if (user.isActive === false)
            throw new Error("บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
          const session: Session = {
            token: "offline-" + user.username,
            user: {
              username: user.username,
              role: user.role,
              profile: user.profile,
            },
          };
          saveSession(session);
          return session;
        },
      ),
    register: (data: {
      username: string;
      password: string;
      role: UserRole;
      profile: UserProfile;
    }) =>
      fallback(
        () =>
          request("/auth/register", {
            method: "POST",
            body: JSON.stringify({
              username: data.username,
              name: data.profile.name,
              email: data.profile.email,
              password: data.password,
              dob: data.profile.dob,
              phone: data.profile.phone,
              thaiId: data.profile.thaiId,
              passportNo: data.profile.passportNo,
            }),
          }).then(() => ({ success: true })),
        () => {
          const users = read<any[]>(KEYS.users, []);
          if (
            users.some(
              (u) =>
                u.username === data.username ||
                u.profile.email === data.profile.email,
            )
          )
            throw new Error("ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว");
          users.push({ ...data });
          write(KEYS.users, users);
          return { success: true };
        },
      ),
    getSession: () =>
      fallback(
        () =>
          request<Session>("/auth/session")
            .then((s) => {
              saveSession(s);
              return s;
            })
            .catch((error) => {
              if (error instanceof ApiRequestError && error.status === 401) {
                saveSession(null);
                return null;
              }
              throw error;
            }),
        () => getSession(),
      ),
    logout: async () => {
      try {
        await request("/auth/logout", { method: "POST", body: "{}" });
      } catch (error) {
        if (
          !(error instanceof ApiUnavailable) &&
          !(error instanceof ApiRequestError && error.status === 401)
        )
          throw error;
      }
      saveSession(null);
    },
    updateProfile: (_username: string, profile: UserProfile) =>
      fallback(
        () =>
          request<{ profile: UserProfile }>("/auth/profile", {
            method: "PUT",
            body: JSON.stringify({
              name: profile.name,
              email: profile.email,
              dob: profile.dob,
              phone: profile.phone,
              thaiId: profile.thaiId,
            }),
          }).then((r) => r.profile),
        () => {
          const session = getSession();
          if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
          session.user.profile = profile;
          saveSession(session);
          const users = read<any[]>(KEYS.users, []).map((u) =>
            u.username === session.user.username ? { ...u, profile } : u,
          );
          write(KEYS.users, users);
          return profile;
        },
      ),
    changePassword: (currentPassword: string, newPassword: string) =>
      fallback(
        () =>
          request<{ ok: boolean }>("/auth/password", {
            method: "PUT",
            body: JSON.stringify({ currentPassword, newPassword }),
          }),
        () => {
          const session = getSession();
          if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
          const users = read<any[]>(KEYS.users, []);
          const current = users.find(
            (user) => user.username === session.user.username,
          );
          if (!current || current.password !== currentPassword)
            throw new Error("รหัสผ่านปัจจุบันไม่ถูกต้อง");
          if (newPassword.length < 8)
            throw new Error("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
          if (newPassword === currentPassword)
            throw new Error("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน");
          write(
            KEYS.users,
            users.map((user) =>
              user.username === session.user.username
                ? { ...user, password: newPassword }
                : user,
            ),
          );
          return { ok: true };
        },
      ),
  },
  admin: {
    listUsers: () =>
      fallback(
        () =>
          request<{ users: ManagedUser[] }>("/admin/users").then(
            (response) => response.users,
          ),
        demoManagedUsers,
      ),
    createEmployee: (data: EmployeeAccountInput) =>
      fallback(
        () =>
          request<{ user: ManagedUser }>("/admin/employees", {
            method: "POST",
            body: JSON.stringify(data),
          }).then((response) => response.user),
        () => {
          const users = read<any[]>(KEYS.users, []);
          if (
            users.some(
              (user) =>
                user.username === data.username ||
                user.profile?.email === data.email,
            )
          )
            throw new Error("ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว");
          const id = Date.now();
          users.push({
            id,
            username: data.username,
            password: data.password,
            role: data.role,
            isActive: true,
            createdAt: new Date().toISOString(),
            department: data.department,
            employeeId: data.employeeId,
            licenseId: data.licenseId,
            profile: {
              name: data.name,
              dob: data.dob,
              phone: data.phone,
              email: data.email,
              thaiId: "",
            },
          });
          write(KEYS.users, users);
          return demoManagedUsers().find((user) => user.id === id)!;
        },
      ),
    updateUser: (id: number, data: ManagedAccountUpdateInput) =>
      fallback(
        () =>
          request<{ user: ManagedUser }>(`/admin/users/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          }).then((response) => response.user),
        () => {
          const managed = demoManagedUsers().find((user) => user.id === id);
          if (!managed) throw new Error("ไม่พบบัญชีผู้ใช้");
          const users = read<any[]>(KEYS.users, []);
          const updated = users.map((user, index) => {
            if (Number(user.id ?? index + 1) !== id) return user;
            return {
              ...user,
              username: data.username ?? user.username,
              password: data.password || user.password,
              role: data.role ?? user.role,
              isActive: data.isActive ?? user.isActive ?? true,
              department: data.department ?? user.department ?? "",
              employeeId: data.employeeId ?? user.employeeId ?? "",
              licenseId: data.licenseId ?? user.licenseId ?? "",
              profile: {
                ...user.profile,
                name: data.name ?? user.profile?.name,
                dob: data.dob ?? user.profile?.dob,
                phone: data.phone ?? user.profile?.phone,
                email: data.email ?? user.profile?.email,
                thaiId: data.thaiId ?? user.profile?.thaiId,
              },
            };
          });
          write(KEYS.users, updated);
          return demoManagedUsers().find((user) => user.id === id)!;
        },
      ),
  },
  vans: {
    list: () =>
      fallback(
        () =>
          request<{ vans: any[] }>("/trips").then((r) => r.vans.map(mapVan)),
        demoVans,
      ),
    updateStatus: (id: string, status: Van["status"], report?: string) =>
      fallback(
        () =>
          request(`/trips/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status, report }),
          }).then(() =>
            api.vans.list().then((v) => v.find((x) => x.id === id)!),
          ),
        () => updateVan(id, { status }),
      ),
    updateLocation: (id: string, currentStop: string) =>
      request(`/trips/${id}/location`, {
        method: "PATCH",
        body: JSON.stringify({ current_stop: currentStop }),
      }),
    updateDepartureTime: (id: string, departure_time: string) =>
      fallback(
        () =>
          request(`/trips/${id}/time`, {
            method: "PATCH",
            body: JSON.stringify({ departure_time }),
          }).then(() =>
            api.vans.list().then((v) => v.find((x) => x.id === id)!),
          ),
        () =>
          updateVan(id, {
            departureTime: departure_time.slice(11, 16) || departure_time,
          }),
      ),
    updateArrivalTime: (id: string, arrive_time: string) =>
      fallback(
        () =>
          request(`/trips/${id}/time`, {
            method: "PATCH",
            body: JSON.stringify({ arrive_time }),
          }).then(() =>
            api.vans.list().then((v) => v.find((x) => x.id === id)!),
          ),
        () =>
          updateVan(id, {
            arrivalTime: arrive_time.slice(11, 16) || arrive_time,
          }),
      ),
    completeTrip: (id: string) =>
      fallback(
        () =>
          request(`/trips/${id}/complete`, { method: "POST", body: "{}" }).then(
            () => api.vans.list().then((v) => v.find((x) => x.id === id)!),
          ),
        () => {
          const van = updateVan(id, { status: "Completed" });
          const bookings = demoBookings().map((booking) =>
            booking.vanId === id &&
            (booking.status === "Paid" || booking.status === "Boarded")
              ? { ...booking, status: "Completed" as const }
              : booking,
          );
          write(KEYS.bookings, bookings);
          return van;
        },
      ),
    reportIncident: (
      id: string,
      detail: string,
      incidentType: "breakdown" | "accident",
    ) =>
      fallback(
        () =>
          request(`/trips/${id}/incident`, {
            method: "POST",
            body: JSON.stringify({ detail, incident_type: incidentType }),
          }),
        () => {
          updateVan(id, {
            status: "Accident",
            accidentReport: `${incidentType}:${detail}`,
          });
          return { ok: true };
        },
      ),
    create: (data: {
      destination: string;
      drop_off_points: string[];
      departure_time: string;
      vehicle_type: string;
      license_plate: string;
      total_seats: number;
      driver_id: number;
      price: number;
    }) =>
      // The client may run without the API, so enforce the same vehicle rules here.
      // Do not trust a seat count passed by a form or browser devtools.
      fallback(
        () =>
          request<{ trip: any }>("/trips", {
            method: "POST",
            body: JSON.stringify(data),
          }).then((r) => r.trip),
        () => {
          const vans = demoVans();
          const van: Van = {
            id: String(Date.now()),
            plateNo: data.license_plate,
            vanType: data.vehicle_type,
            capacity: vehicleCapacity(data.vehicle_type),
            status: "Waiting",
            destination: data.destination,
            dropOffPoints: data.drop_off_points,
            departureTime: data.departure_time.slice(11, 16),
            price: data.price,
            driverId: String(data.driver_id),
            occupiedSeats: [],
            pendingSeats: [],
            date: data.departure_time.slice(0, 10),
          };
          write(KEYS.vans, [...vans, van]);
          return van;
        },
      ),
  },
  bookings: {
    list: () =>
      fallback(
        () =>
          request<{ bookings: any[] }>("/bookings").then((r) =>
            r.bookings.map(mapBooking),
          ),
        () => {
          const user = demoUser();
          const bookings = demoBookings();
          return user?.role === "passenger"
            ? bookings.filter((b) => b.passengerPhone === user.profile.phone)
            : bookings;
        },
      ),
    create: (
      vanId: string,
      seatNo: number,
      boardingPoint: string,
      dropOffPoint: string,
      date: string,
      profile: UserProfile,
    ) =>
      fallback(
        () =>
          request<{ booking: any }>("/bookings", {
            method: "POST",
            body: JSON.stringify({
              trip_id: Number(vanId),
              seat_number: String(seatNo),
              boarding_point: boardingPoint,
              alighting_point: dropOffPoint,
              date,
              amount: 220,
            }),
          }).then((r) => mapBooking(r.booking)),
        () => {
          const van = demoVans().find((v) => v.id === vanId);
          if (!van) throw new Error("ไม่พบเที่ยวรถ");
          if (van.occupiedSeats.includes(seatNo))
            throw new Error("ที่นั่งนี้ถูกจองแล้ว");
          updateVan(vanId, { occupiedSeats: [...van.occupiedSeats, seatNo] });
          updateVan(vanId, {
            pendingSeats: [...(van.pendingSeats || []), seatNo],
          });
          const booking: Booking = {
            id: String(Date.now()),
            vanId,
            passengerName: profile.name,
            passengerPhone: profile.phone,
            seatNo,
            dropOffPoint,
            date,
            timeSlot: van.departureTime,
            status: "Pending Payment",
            createdAt: Date.now(),
            unpaidExpiresAt: Date.now() + 300000,
          };
          write(KEYS.bookings, [booking, ...demoBookings()]);
          return booking;
        },
      ),
    pay: (id: string) =>
      fallback(
        () =>
          request<{ booking: any }>(`/bookings/${id}/pay`, {
            method: "POST",
            body: "{}",
          }).then((r) => mapBooking(r.booking)),
        () => {
          const current = demoBookings().find((b) => b.id === id);
          if (current) {
            const van = demoVans().find((item) => item.id === current.vanId);
            if (van) {
              updateVan(van.id, {
                pendingSeats: (van.pendingSeats || []).filter(
                  (seat) => seat !== current.seatNo,
                ),
              });
            }
          }
          const bookings = demoBookings().map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: "Paid" as const,
                  qrCode: "offline-" + id,
                  receiptNo: "REC-DEMO-" + id.slice(-6),
                  amount: demoVans().find((v) => v.id === b.vanId)?.price || 0,
                }
              : b,
          );
          write(KEYS.bookings, bookings);
          return bookings.find((b) => b.id === id)!;
        },
      ),
    cancel: (id: string) =>
      fallback(
        () =>
          request<{ booking: any }>(`/bookings/${id}/cancel`, {
            method: "POST",
            body: "{}",
          }).then((r) => mapBooking(r.booking)),
        () => {
          const current = demoBookings().find((b) => b.id === id);
          if (!current) throw new Error("ไม่พบการจอง");
          updateVan(current.vanId, {
            occupiedSeats: demoVans()
              .find((v) => v.id === current.vanId)!
              .occupiedSeats.filter((s) => s !== current.seatNo),
            pendingSeats: (demoVans().find((v) => v.id === current.vanId)!
              .pendingSeats || []).filter((s) => s !== current.seatNo),
          });
          const bookings = demoBookings().map((b) =>
            b.id === id ? { ...b, status: "Cancelled" as const } : b,
          );
          write(KEYS.bookings, bookings);
          return bookings.find((b) => b.id === id)!;
        },
      ),
    board: (id: string) =>
      fallback(
        () =>
          request<{ booking: any }>(`/bookings/${id}/board`, {
            method: "POST",
            body: "{}",
          }).then((r) => mapBooking(r.booking)),
        () => {
          const bookings = demoBookings().map((b) =>
            b.id === id
              ? { ...b, status: "Boarded" as const, checkedInAt: Date.now() }
              : b,
          );
          write(KEYS.bookings, bookings);
          return bookings.find((b) => b.id === id)!;
        },
      ),
    alight: (id: string) =>
      fallback(
        () =>
          request<{ booking: any }>(`/bookings/${id}/alight`, {
            method: "POST",
            body: "{}",
          }).then((r) => mapBooking(r.booking)),
        () => {
          const current = demoBookings().find((b) => b.id === id);
          if (!current) throw new Error("ไม่พบการจอง");
          updateVan(current.vanId, {
            occupiedSeats: demoVans()
              .find((v) => v.id === current.vanId)!
              .occupiedSeats.filter((seat) => seat !== current.seatNo),
          });
          const bookings = demoBookings().map((b) =>
            b.id === id ? { ...b, status: "Alighted" as const } : b,
          );
          write(KEYS.bookings, bookings);
          return bookings.find((b) => b.id === id)!;
        },
      ),
    alightStop: (tripId: string, stop: string) =>
      request<{ count: number }>(`/trips/${tripId}/alight-stop`, {
        method: "POST",
        body: JSON.stringify({ alighting_point: stop }),
      }),
  },
  drivers: {
    list: () =>
      fallback(
        () =>
          request<{ drivers: any[] }>("/drivers").then((r) =>
            r.drivers.map(mapDriver),
          ),
        demoDrivers,
      ),
    submitReview: (
      id: string,
      bookingId: string,
      rating: number,
      comment: string,
      passengerName: string,
    ) =>
      fallback(
        () =>
          request(`/drivers/${id}/reviews`, {
            method: "POST",
            body: JSON.stringify({ booking_id: Number(bookingId), rating, comment }),
          }).then(() =>
            api.drivers.list().then((drivers) =>
              drivers.find((driver) => driver.id === id),
            ),
          ),
        () => {
          const drivers = demoDrivers();
          const updated = drivers.map((driver) => {
            if (driver.id !== id) return driver;
            const reviews = [
              ...driver.reviews,
              {
                rating,
                comment,
                passengerName,
                date: bangkokDate(),
              },
            ];
            const average =
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length;
            return {
              ...driver,
              reviews,
              rating: Math.round(average * 10) / 10,
            };
          });
          write(KEYS.drivers, updated);
          return updated.find((driver) => driver.id === id);
        },
      ),
  },
  scanner: {
    scan: (value: string) =>
      fallback(
        () =>
          request<{
            valid: boolean;
            status: string;
            payment_status: string;
            ticket: any;
          }>("/scan", {
            method: "POST",
            body: JSON.stringify({ qr_code: value }),
          }),
        () => {
          const booking = demoBookings().find(
            (b) => b.qrCode === value || b.id === value.replace("offline-", ""),
          );
          if (!booking) throw new Error("ไม่พบตั๋ว");
          return {
            valid: booking.status === "Paid" || booking.status === "Boarded",
            status: booking.status,
            payment_status: booking.status,
            ticket: { seat_number: booking.seatNo },
          };
        },
      ),
  },
  notifications: {
    list: () =>
      fallback(
        () =>
          request<{ notifications: any[] }>("/notifications").then(
            (r) => r.notifications,
          ),
        () => read<any[]>(KEYS.notifications, []),
      ),
    markRead: () =>
      fallback(
        () => request("/notifications/read", { method: "POST", body: "{}" }),
        () => ({ ok: true }),
      ),
  },
  followers: {
    list: () => request<{ outgoing: any[]; incoming: any[]; tracking: any[] }>("/followers"),
    add: (phone: string, relationship: string) =>
      request("/followers", { method: "POST", body: JSON.stringify({ phone, relationship }) }),
    respond: (id: string, status: "accepted" | "denied") =>
      request(`/followers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    remove: (id: string) => request(`/followers/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: () =>
      fallback(
        () =>
          request<{ transactions: any[] }>("/reports/daily").then((r) =>
            r.transactions.map(
              (t: any): Transaction => ({
                id: String(t.payment_id),
                bookingId: String(t.booking_id),
                passengerName: t.passenger_name || "-",
                amount: Number(t.amount),
                status:
                  t.payment_status === "success"
                    ? "Success"
                    : t.payment_status === "cancelled"
                      ? "Cancelled"
                      : "Pending",
                date: t.payment_datetime
                  ? bangkokDate(new Date(t.payment_datetime))
                  : "",
                time: t.payment_datetime
                  ? bangkokTime(new Date(t.payment_datetime))
                  : "",
                receiptNo: t.receipt_no,
              }),
            ),
          ),
        () =>
          demoBookings().map(
            (b): Transaction => ({
              id: "txn-" + b.id,
              bookingId: b.id,
              passengerName: b.passengerName,
              amount: demoVans().find((v) => v.id === b.vanId)?.price || 0,
              status:
                b.status === "Paid" ||
                b.status === "Boarded" ||
                b.status === "Completed"
                  ? "Success"
                  : b.status === "Cancelled"
                    ? "Cancelled"
                    : "Pending",
              date: b.date,
              time: b.timeSlot,
            }),
          ),
      ),
  },
};
