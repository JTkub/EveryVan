import type { UserProfile, Booking, Van, Driver, Transaction, UserRole, ManagedUser, EmployeeAccountInput, ManagedAccountUpdateInput, } from "../types/domain";
import type { RecurringSchedule, RecurringScheduleInput } from "../types/domain";
const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const SESSION_KEY = "everyvan_api_session";
type Session = {
    token: string;
    user: {
        username: string;
        role: UserRole;
        profile: UserProfile;
    };
};
class ApiUnavailable extends Error {
}
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
    if (dataMode === mode)
        return;
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
const write = <T>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));
const getSession = (): Session | null => read<Session | null>(SESSION_KEY, null);
const saveSession = (session: Session | null) => session ? write(SESSION_KEY, session) : localStorage.removeItem(SESSION_KEY);
const bangkokDate = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(value);
    const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
    return `${pick("year")}-${pick("month")}-${pick("day")}`;
};
const bangkokTime = (value: Date) => new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
}).format(value);
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const session = getSession();
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (session?.token)
        headers.set("Authorization", `Bearer ${session.token}`);
    let response: Response;
    try {
        response = await fetch(`${BASE}${path}`, { ...options, headers });
    }
    catch {
        setDataMode("offline");
        throw new ApiUnavailable("ไม่สามารถเชื่อมต่อ API ได้");
    }
    const data = await response.json().catch(() => ({}));
    setDataMode("online");
    if (!response.ok) {
        if (response.status === 503) {
            setDataMode("offline");
            throw new ApiUnavailable(data.error || "API ยังไม่พร้อมใช้งาน");
        }
        throw new ApiRequestError(data.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", response.status);
    }
    return data as T;
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
    recurringId: v.recurringId,
    scheduleOverride: v.scheduleOverride,
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
    status: ({
        pending: "Pending Payment",
        paid: "Paid",
        boarded: "Boarded",
        alighted: "Alighted",
        completed: "Completed",
        cancelled: "Cancelled",
    } as any)[b.booking_status] ||
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
    driverId: b.driver_id !== undefined
        ? String(b.driver_id)
        : b.driverId !== undefined
            ? String(b.driverId)
            : undefined,
    driverName: b.driver_name ?? b.driverName,
    driverPhoto: b.driver_photo ?? b.driverPhoto,
});
export const api = {
    recurring: {
        list: () => request<{ schedules: RecurringSchedule[] }>("/recurring-schedules").then(r => r.schedules),
        save: (data: RecurringScheduleInput, id?: number) => request<{ recurring_id: number; created: number }>(id ? `/recurring-schedules/${id}` : "/recurring-schedules", {
            method: id ? "PUT" : "POST", body: JSON.stringify(data),
        }),
    },
    auth: {
        login: (username: string, password: string) => request<Session>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        }).then((s) => {
            saveSession(s);
            return s;
        }),
        register: (data: {
            username: string;
            password: string;
            role: UserRole;
            profile: UserProfile;
        }) => request("/auth/register", {
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
        getSession: () => request<Session>("/auth/session")
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
        logout: async () => {
            try {
                await request("/auth/logout", { method: "POST", body: "{}" });
            }
            catch (error) {
                if (!(error instanceof ApiUnavailable) &&
                    !(error instanceof ApiRequestError && error.status === 401))
                    throw error;
            }
            saveSession(null);
        },
        updateProfile: (_username: string, profile: UserProfile) => request<{
            profile: UserProfile;
        }>("/auth/profile", {
            method: "PUT",
            body: JSON.stringify({
                name: profile.name,
                email: profile.email,
                dob: profile.dob,
                phone: profile.phone,
                thaiId: profile.thaiId,
            }),
        }).then((r) => r.profile),
        changePassword: (currentPassword: string, newPassword: string) => request<{
            ok: boolean;
        }>("/auth/password", {
            method: "PUT",
            body: JSON.stringify({ currentPassword, newPassword }),
        }),
    },
    admin: {
        listUsers: () => request<{
            users: ManagedUser[];
        }>("/admin/users").then((response) => response.users),
        createEmployee: (data: EmployeeAccountInput) => request<{
            user: ManagedUser;
        }>("/admin/employees", {
            method: "POST",
            body: JSON.stringify(data),
        }).then((response) => response.user),
        updateUser: (id: number, data: ManagedAccountUpdateInput) => request<{
            user: ManagedUser;
        }>(`/admin/users/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }).then((response) => response.user),
    },
    vans: {
        list: () => request<{
            vans: any[];
        }>("/trips").then((r) => r.vans.map(mapVan)),
        updateStatus: (id: string, status: Van["status"], report?: string) => request(`/trips/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status, report }),
        }).then(() => api.vans.list().then((v) => v.find((x) => x.id === id)!)),
        updateLocation: (id: string, currentStop: string) => request(`/trips/${id}/location`, {
            method: "PATCH",
            body: JSON.stringify({ current_stop: currentStop }),
        }),
        updateDepartureTime: (id: string, departure_time: string) => request(`/trips/${id}/time`, {
            method: "PATCH",
            body: JSON.stringify({ departure_time }),
        }).then(() => api.vans.list().then((v) => v.find((x) => x.id === id)!)),
        updateArrivalTime: (id: string, arrive_time: string) => request(`/trips/${id}/time`, {
            method: "PATCH",
            body: JSON.stringify({ arrive_time }),
        }).then(() => api.vans.list().then((v) => v.find((x) => x.id === id)!)),
        completeTrip: (id: string) => request(`/trips/${id}/complete`, { method: "POST", body: "{}" }).then(() => api.vans.list().then((v) => v.find((x) => x.id === id)!)),
        reportIncident: (id: string, detail: string, incidentType: "breakdown" | "accident") => request(`/trips/${id}/incident`, {
            method: "POST",
            body: JSON.stringify({ detail, incident_type: incidentType }),
        }),
        create: (data: {
            destination: string;
            drop_off_points: string[];
            departure_time: string;
            vehicle_type: string;
            license_plate: string;
            total_seats: number;
            driver_id: number;
            price: number;
        }) => request<{
            trip: any;
        }>("/trips", {
            method: "POST",
            body: JSON.stringify(data),
        }).then((r) => r.trip),
    },
    bookings: {
        list: () => request<{
            bookings: any[];
        }>("/bookings").then((r) => r.bookings.map(mapBooking)),
        create: (vanId: string, seatNo: number, boardingPoint: string, dropOffPoint: string, date: string) => request<{
            booking: any;
        }>("/bookings", {
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
        pay: (id: string) => request<{
            booking: any;
        }>(`/bookings/${id}/pay`, {
            method: "POST",
            body: "{}",
        }).then((r) => mapBooking(r.booking)),
        cancel: (id: string) => request<{
            booking: any;
        }>(`/bookings/${id}/cancel`, {
            method: "POST",
            body: "{}",
        }).then((r) => mapBooking(r.booking)),
        board: (id: string) => request<{
            booking: any;
        }>(`/bookings/${id}/board`, {
            method: "POST",
            body: "{}",
        }).then((r) => mapBooking(r.booking)),
        alight: (id: string) => request<{
            booking: any;
        }>(`/bookings/${id}/alight`, {
            method: "POST",
            body: "{}",
        }).then((r) => mapBooking(r.booking)),
        alightStop: (tripId: string, stop: string) => request<{
            count: number;
        }>(`/trips/${tripId}/alight-stop`, {
            method: "POST",
            body: JSON.stringify({ alighting_point: stop }),
        }),
    },
    drivers: {
        list: () => request<{
            drivers: any[];
        }>("/drivers").then((r) => r.drivers.map(mapDriver)),
        submitReview: (id: string, bookingId: string, rating: number, comment: string) => request(`/drivers/${id}/reviews`, {
            method: "POST",
            body: JSON.stringify({ booking_id: Number(bookingId), rating, comment }),
        }).then(() => api.drivers.list().then((drivers) => drivers.find((driver) => driver.id === id))),
    },
    scanner: {
        scan: (value: string) => request<{
            valid: boolean;
            status: string;
            already_checked_in: boolean;
            payment_status: string;
            ticket: any;
        }>("/scan", {
            method: "POST",
            body: JSON.stringify({ qr_code: value }),
        }),
    },
    notifications: {
        list: () => request<{
            notifications: any[];
        }>("/notifications").then((r) => r.notifications),
        markRead: () => request("/notifications/read", { method: "POST", body: "{}" }),
    },
    followers: {
        list: () => request<{
            outgoing: any[];
            incoming: any[];
            tracking: any[];
        }>("/followers"),
        add: (phone: string, relationship: string) => request("/followers", { method: "POST", body: JSON.stringify({ phone, relationship }) }),
        respond: (id: string, status: "accepted" | "denied") => request(`/followers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
        remove: (id: string) => request(`/followers/${id}`, { method: "DELETE" }),
    },
    transactions: {
        list: () => request<{
            transactions: any[];
        }>("/reports/daily").then((r) => r.transactions.map((t: any): Transaction => ({
            id: String(t.payment_id),
            bookingId: String(t.booking_id),
            passengerName: t.passenger_name || "-",
            amount: Number(t.amount),
            status: t.payment_status === "success"
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
        }))),
    },
};
