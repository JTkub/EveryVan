import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BusFront,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Search,
  Settings2,
  ShieldCheck,
  Ticket,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { DROP_OFF_POINTS, VanProvider, useVan } from "./context/VanContext";
import type { Booking, Van } from "./context/VanContext";
import { api } from "./services/api";
import type {
  EmployeeAccountInput,
  EmployeeRole,
  ManagedAccountUpdateInput,
  ManagedUser,
} from "./types/domain";
import { AuthView } from "./view/AuthView";
import { QRCodeSVG } from "qrcode.react";
import {
  bangkokDateInput,
  bangkokDateTimeInput,
  thaiDate,
  thaiTodayLong,
} from "./utils/date";
import { VEHICLE_CAPACITIES, vehicleCapacity } from "./utils/vehicle";
import "./App.css";

type NavKey =
  | "overview"
  | "book"
  | "tickets"
  | "profile"
  | "operations"
  | "create-trip"
  | "scanner"
  | "reports"
  | "accounts"
  | "followers";

const statusText: Record<string, string> = {
  Waiting: "กำลังรอคิว",
  Travelling: "กำลังเดินทาง",
  Departed: "ออกจากสถานีแล้ว",
  Accident: "มีเหตุขัดข้อง",
  Paid: "ชำระแล้ว",
  "Pending Payment": "รอชำระเงิน",
  Boarded: "ขึ้นรถแล้ว",
  Alighted: "ลงระหว่างทางแล้ว",
  Completed: "เดินทางสำเร็จ",
  Cancelled: "ยกเลิกแล้ว",
};
const statusClass = (status: string) =>
  status.toLowerCase().replaceAll(" ", "-");
const roleLabel: Record<string, string> = {
  passenger: "ผู้โดยสาร",
  driver: "คนขับรถ",
  staff: "พนักงานจัดคิว",
  dispatcher: "พนักงานจัดคิว",
  accountant: "เจ้าหน้าที่ฝ่ายบัญชี",
  admin: "ผู้ดูแลระบบ",
};
const roleCode: Record<string, string> = {
  passenger: "PASSENGER",
  driver: "DRIVER",
  staff: "QUEUE STAFF",
  dispatcher: "DISPATCHER",
  accountant: "ACCOUNTING",
  admin: "ADMIN",
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <BusFront size={20} />
      </span>
      <span>
        Every<span>Van</span>
      </span>
    </div>
  );
}

function Sidebar({
  active,
  onChange,
  mobileOpen,
  close,
}: {
  active: NavKey;
  onChange: (key: NavKey) => void;
  mobileOpen: boolean;
  close: () => void;
}) {
  const { currentUser, logout, bookings } = useVan();
  const role = currentUser?.role;
  const ticketCount = bookings.filter(
    (booking) =>
      booking.passengerPhone === currentUser?.profile.phone &&
      booking.status !== "Cancelled",
  ).length;
  const items =
    role === "passenger"
      ? [
          { key: "overview" as NavKey, icon: LayoutDashboard, label: "ภาพรวม" },
          { key: "book" as NavKey, icon: Search, label: "จองตั๋วรถตู้" },
          { key: "tickets" as NavKey, icon: Ticket, label: "ตั๋วของฉัน" },
          { key: "profile" as NavKey, icon: UserRound, label: "ข้อมูลส่วนตัว" },
        ]
      : role === "driver"
        ? [
            {
              key: "overview" as NavKey,
              icon: LayoutDashboard,
              label: "ภาพรวมวันนี้",
            },
            {
              key: "operations" as NavKey,
              icon: UsersRound,
              label: "ผู้โดยสารขึ้นรถ",
            },
            { key: "scanner" as NavKey, icon: QrCode, label: "สแกน QR ตั๋ว" },
            {
              key: "profile" as NavKey,
              icon: UserRound,
              label: "โปรไฟล์คนขับ",
            },
          ]
        : role === "staff" || role === "dispatcher"
          ? [
              {
                key: "overview" as NavKey,
                icon: LayoutDashboard,
                label: "ภาพรวมคิวรถ",
              },
              {
                key: "operations" as NavKey,
                icon: CalendarDays,
                label: "จัดการเวลาและสถานะ",
              },
              {
                key: "create-trip" as NavKey,
                icon: BusFront,
                label: "เพิ่มเที่ยวรถ",
              },
              {
                key: "profile" as NavKey,
                icon: UserRound,
                label: "ข้อมูลส่วนตัว",
              },
            ]
          : role === "accountant"
            ? [
                {
                  key: "overview" as NavKey,
                  icon: CircleDollarSign,
                  label: "ภาพรวมการเงิน",
                },
                {
                  key: "reports" as NavKey,
                  icon: Ticket,
                  label: "รายการชำระเงิน",
                },
                {
                  key: "profile" as NavKey,
                  icon: UserRound,
                  label: "ข้อมูลส่วนตัว",
                },
              ]
            : [
                {
                  key: "overview" as NavKey,
                  icon: LayoutDashboard,
                  label: "ภาพรวมระบบ",
                },
                {
                  key: "operations" as NavKey,
                  icon: CalendarDays,
                  label: "จัดการเที่ยวรถ",
                },
                {
                  key: "create-trip" as NavKey,
                  icon: BusFront,
                  label: "เพิ่มเที่ยวรถ",
                },
                {
                  key: "reports" as NavKey,
                  icon: CircleDollarSign,
                  label: "รายงานการเงิน",
                },
                {
                  key: "accounts" as NavKey,
                  icon: UsersRound,
                  label: "จัดการบัญชี",
                },
                {
                  key: "profile" as NavKey,
                  icon: UserRound,
                  label: "ข้อมูลส่วนตัว",
                },
              ];
  return (
    <aside className={`sidebar-new ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-head">
        <Brand />
        <button className="icon-button mobile-only" onClick={close}>
          <X size={20} />
        </button>
      </div>
      <div className="workspace">
        <span className="workspace-dot" /> ระบบจองรถตู้{" "}
        <ChevronLeft size={14} />
      </div>
      <nav className="nav-list">
        {[...items, { key: "followers" as NavKey, icon: UsersRound, label: "ผู้ติดตามการเดินทาง" }].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`nav-link ${active === key ? "active" : ""}`}
            onClick={() => {
              onChange(key);
              close();
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
            {key === "tickets" && ticketCount > 0 && (
              <span className="nav-count">{ticketCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="help-card">
          <ShieldCheck size={18} />
          <div>
            <strong>ต้องการความช่วยเหลือ?</strong>
            <small>ติดต่อศูนย์บริการ EveryVan</small>
          </div>
        </div>
        <button className="nav-link logout" onClick={logout}>
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}

function Topbar({ title, openMenu }: { title: string; openMenu: () => void }) {
  const { currentUser, notifications, markNotificationsAsRead } = useVan();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unread = notifications.filter((n) => !n.isRead).length;
  const toggleNotifications = () => {
    const opening = !notificationOpen;
    setNotificationOpen(opening);
    if (opening && unread > 0) markNotificationsAsRead();
  };
  return (
    <header className="topbar-new">
      <button
        className="icon-button mobile-only"
        aria-label="เปิดเมนู"
        onClick={openMenu}
      >
        <Menu size={21} />
      </button>
      <div>
        <p className="eyebrow">
          EVERYVAN / {roleCode[currentUser?.role || "admin"]}
        </p>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        <div className="notification-wrap">
          <button
            className="notification-button"
            aria-label="การแจ้งเตือน"
            aria-expanded={notificationOpen}
            onClick={toggleNotifications}
          >
            <Bell size={19} />
            {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
          </button>
          {notificationOpen && (
            <div
              className="notification-popover"
              role="dialog"
              aria-label="รายการแจ้งเตือน"
            >
              <div className="notification-head">
                <strong>การแจ้งเตือน</strong>
                <small>{notifications.length} รายการ</small>
              </div>
              <div className="notification-list">
                {notifications.slice(0, 8).map((notification) => (
                  <div
                    className={`notification-item ${notification.type}`}
                    key={notification.id}
                  >
                    <i />
                    <div>
                      <p>{notification.message}</p>
                      <small>{notification.timestamp}</small>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="notification-empty">
                    <Bell size={23} />
                    <span>ยังไม่มีการแจ้งเตือน</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="top-profile">
          <div className="avatar">
            {currentUser?.profile.name.slice(0, 1) || "E"}
          </div>
          <div className="top-profile-copy">
            <strong>{currentUser?.profile.name || "EveryVan user"}</strong>
            <small>{roleLabel[currentUser?.role || "admin"]}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  icon: typeof BusFront;
  label: string;
  value: string | number;
  note: string;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

function TripCard({ van, onBook }: { van: Van; onBook: (van: Van) => void }) {
  const { drivers } = useVan();
  const free = van.capacity - van.occupiedSeats.length;
  const driver = drivers.find((item) => item.id === van.driverId);
  return (
    <article className="trip-card">
      <div className="trip-top">
        <span className="trip-type">{van.vanType || "Toyota Commuter"}</span>
        <span className={`status-pill ${statusClass(van.status)}`}>
          {statusText[van.status]}
        </span>
      </div>
      <div className="trip-route">
        <div>
          <small>ต้นทาง</small>
          <strong>กรุงเทพฯ</strong>
        </div>
        <div className="route-line">
          <span>{van.departureTime}</span>
          <i />
          <small>ประมาณ 2 ชม.</small>
        </div>
        <div className="route-destination">
          <small>ปลายทาง</small>
          <strong>{van.destination}</strong>
        </div>
      </div>
      <div className="trip-meta">
        <span>
          <CalendarDays size={15} /> {thaiDate(van.date)}
        </span>
        <span>
          <UsersRound size={15} /> เหลือ {free} ที่นั่ง
        </span>
        {!!van.pendingSeats?.length && (
          <span className="seat-pending-text">กำลังจอง {van.pendingSeats.length} ที่นั่ง</span>
        )}
        <strong>
          {van.price.toLocaleString()} <small>บาท</small>
        </strong>
      </div>
      <div className="trip-driver">
        {driver?.avatar ? (
          <img src={driver.avatar} alt={`รูปของ ${driver.name}`} />
        ) : (
          <span className="avatar small">{driver?.name.slice(0, 1) || "-"}</span>
        )}
        <span>
          <small>ผู้ขับรถ</small>
          <strong>{driver?.name || "กำลังระบุคนขับ"}</strong>
        </span>
        <span className="seat-capacity">{van.capacity} ที่นั่ง</span>
      </div>
      <button
        className="btn primary full"
        disabled={van.status !== "Waiting" || free === 0}
        onClick={() => onBook(van)}
      >
        เลือกเที่ยวนี้ <ArrowRight size={16} />
      </button>
    </article>
  );
}

function PassengerOverview({
  onNavigate,
  onBook,
}: {
  onNavigate: (key: NavKey) => void;
  onBook: (van: Van) => void;
}) {
  const { currentUser, vans, bookings } = useVan();
  const upcoming = vans.filter((v) => v.status === "Waiting").slice(0, 3);
  const myBookings = bookings.filter(
    (b) =>
      b.passengerPhone === currentUser?.profile.phone &&
      b.status !== "Cancelled",
  );
  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow accent">{thaiTodayLong()}</p>
          <h2>
            สวัสดี, {currentUser?.profile.name.split(" ")[0] || "ผู้โดยสาร"}{" "}
            <span className="wave">✦</span>
          </h2>
          <p className="muted">พร้อมออกเดินทางไปที่ไหนวันนี้?</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate("book")}>
          <Search size={17} /> ค้นหาเที่ยวรถ
        </button>
      </section>
      <section className="hero-banner">
        <div>
          <span className="hero-kicker">เดินทางง่ายขึ้นในทุกวัน</span>
          <h2>
            จองรถตู้ของคุณ
            <br />
            <em>ได้ในไม่กี่ขั้นตอน</em>
          </h2>
          <p>
            เลือกเส้นทางและที่นั่งที่ต้องการ พร้อมรับตั๋วอิเล็กทรอนิกส์ทันที
          </p>
          <button className="btn light" onClick={() => onNavigate("book")}>
            เริ่มจองตั๋ว <ArrowRight size={16} />
          </button>
        </div>
        <div className="hero-art">
          <div className="sun" />
          <div className="road" />
          <BusFront size={100} />
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          icon={Ticket}
          label="ตั๋วที่ใช้งานอยู่"
          value={myBookings.length}
          note="ดูรายละเอียดตั๋วของคุณ"
          tone="blue"
        />
        <Stat
          icon={Clock3}
          label="เที่ยวรถวันนี้"
          value={upcoming.length}
          note="มีรอบให้เลือก"
          tone="mint"
        />
        <Stat
          icon={MapPin}
          label="เส้นทางทั้งหมด"
          value={new Set(vans.map((v) => v.destination)).size}
          note="ปลายทางยอดนิยม"
          tone="purple"
        />
      </div>
      <section className="section-head">
        <div>
          <h3>เที่ยวรถแนะนำ</h3>
          <p className="muted">รอบรถที่กำลังเปิดให้จอง</p>
        </div>
        <button className="text-button" onClick={() => onNavigate("book")}>
          ดูทั้งหมด <ArrowRight size={15} />
        </button>
      </section>
      <div className="trip-grid">
        {upcoming.map((v) => (
          <TripCard key={v.id} van={v} onBook={onBook} />
        ))}
        {upcoming.length === 0 && (
          <EmptyState text="ยังไม่มีเที่ยวรถที่เปิดให้จอง" />
        )}
      </div>
    </div>
  );
}

function BookingPage({
  initialVan,
  onDone,
}: {
  initialVan?: Van;
  onDone: () => void;
}) {
  const { vans, drivers, boardingPoints, bookTicket, confirmPayment } = useVan();
  const [selectedVan, setSelectedVan] = useState<Van | null>(
    initialVan || null,
  );
  const [seat, setSeat] = useState<number | null>(null);
  const [point, setPoint] = useState(boardingPoints[0] || "สถานีขนส่งหมอชิต 2");
  const [dropOffPoint, setDropOffPoint] = useState(
    initialVan ? (DROP_OFF_POINTS[initialVan.destination] || [initialVan.destination])[0] : "",
  );
  const [date, setDate] = useState(initialVan?.date || bangkokDateInput());
  const [destinationFilter, setDestinationFilter] = useState("");
  const [step, setStep] = useState(initialVan ? 2 : 1);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const availableVans = vans.filter(
    (v) =>
      v.status === "Waiting" &&
      (!destinationFilter || v.destination === destinationFilter) &&
      (!v.date || v.date === date),
  );
  const seats = Array.from(
    { length: selectedVan?.capacity || 14 },
    (_, i) => i + 1,
  );
  const dropOffOptions = selectedVan
    ? DROP_OFF_POINTS[selectedVan.destination] || [selectedVan.destination]
    : [];
  useEffect(() => {
    if (!selectedVan) return;
    const updatedVan = vans.find((van) => van.id === selectedVan.id);
    if (updatedVan) setSelectedVan(updatedVan);
  }, [vans, selectedVan?.id]);
  const chooseVan = (v: Van) => {
    setSelectedVan(v);
    setSeat(null);
    setDropOffPoint((DROP_OFF_POINTS[v.destination] || [v.destination])[0]);
    setStep(2);
  };
  const createBooking = async () => {
    if (!selectedVan || seat === null) return;
    setBusy(true);
    setError("");
    try {
      const b = await bookTicket(selectedVan.id, seat, point, dropOffPoint, date);
      setBooking(b);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ไม่สามารถจองที่นั่งได้");
    } finally {
      setBusy(false);
    }
  };
  const pay = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await confirmPayment(booking.id);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ชำระเงินไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">BOOK A RIDE</p>
          <h2>จองเที่ยวรถตู้</h2>
          <p className="muted">เลือกเที่ยวรถที่เหมาะกับแผนการเดินทางของคุณ</p>
        </div>
        <div className="stepper">
          {["เที่ยวรถ", "ที่นั่ง", "ยืนยัน", "ชำระเงิน"].map((s, i) => (
            <div
              className={
                step > i + 1 ? "done" : step === i + 1 ? "current" : ""
              }
              key={s}
            >
              <span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {step === 1 && (
        <>
          <div className="search-panel">
            <div className="field">
              <label>ปลายทาง</label>
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
              >
                <option value="">ทุกปลายทาง</option>
                {[...new Set(vans.map((v) => v.destination))].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>วันที่เดินทาง</label>
              <input
                type="date"
                min={bangkokDateInput()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="filter-live">
              <Check size={16} /> อัปเดตผลลัพธ์อัตโนมัติ
            </div>
          </div>
          <div className="section-head">
            <div>
              <h3>เที่ยวรถทั้งหมด</h3>
              <p className="muted">
                พบ {availableVans.length} เที่ยวรถที่พร้อมให้บริการ
              </p>
            </div>
          </div>
          <div className="trip-grid">
            {availableVans.map((v) => (
              <TripCard key={v.id} van={v} onBook={chooseVan} />
            ))}
            {availableVans.length === 0 && (
              <EmptyState text="ไม่พบเที่ยวรถตามวันหรือปลายทางที่เลือก" />
            )}
          </div>
        </>
      )}
      {step === 2 && selectedVan && (
        <div className="booking-layout">
          <div className="card-panel">
            <button className="back-link" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> เปลี่ยนเที่ยวรถ
            </button>
            <h3>เลือกที่นั่งของคุณ</h3>
            <div className="selected-trip">
              <div className="mini-icon">
                <BusFront size={20} />
              </div>
              <div>
                <strong>กรุงเทพฯ → {selectedVan.destination}</strong>
                <small>
                  {thaiDate(date)} · {selectedVan.departureTime} น. ·{" "}
                  {selectedVan.plateNo}
                </small>
              </div>
              <span>{selectedVan.price.toLocaleString()} บาท</span>
            </div>
            <div className="booking-driver">
              {(() => {
                const driver = drivers.find((item) => item.id === selectedVan.driverId);
                return (
                  <>
                    {driver?.avatar ? (
                      <img src={driver.avatar} alt={`รูปของ ${driver.name}`} />
                    ) : (
                      <span className="avatar small">{driver?.name.slice(0, 1) || "-"}</span>
                    )}
                    <span>คนขับรถ: <strong>{driver?.name || "กำลังระบุคนขับ"}</strong></span>
                    <span className="seat-capacity">รถ {selectedVan.vanType} · {selectedVan.capacity} ที่นั่ง</span>
                  </>
                );
              })()}
            </div>
            <div className="van-seat-map">
              <div className="seat-front">
                ด้านหน้ารถ <span>คนขับ</span>
              </div>
              <div className="seat-grid">
                {seats.map((n) => (
                  <button
                    key={n}
                    className={`seat-button ${selectedVan.pendingSeats?.includes(n) ? "pending" : selectedVan.occupiedSeats.includes(n) ? "occupied" : seat === n ? "selected" : ""}`}
                    disabled={selectedVan.occupiedSeats.includes(n)}
                    onClick={() => setSeat(n)}
                    title={selectedVan.pendingSeats?.includes(n) ? "กำลังมีผู้โดยสารทำรายการจอง (หมดอายุภายใน 5 นาที)" : selectedVan.occupiedSeats.includes(n) ? "ที่นั่งนี้ถูกจองแล้ว" : "ที่นั่งว่าง"}
                  >
                    {String(n).padStart(2, "0")}
                  </button>
                ))}
              </div>
              <div className="seat-legend">
                <span>
                  <i className="available" />
                  ว่าง
                </span>
                <span>
                  <i className="selected-dot" />
                  เลือกแล้ว
                </span>
                <span>
                  <i className="occupied-dot" />
                  ไม่ว่าง
                </span>
                <span>
                  <i className="pending-dot" />
                  กำลังจอง (5 นาที)
                </span>
              </div>
              <p className="seat-sync-note">สถานะที่นั่งอัปเดตอัตโนมัติทุก 5 วินาที</p>
            </div>
          </div>
          <aside className="booking-summary card-panel">
            <span className="summary-label">สรุปการจอง</span>
            <h3>{selectedVan.destination}</h3>
            <div className="summary-row">
              <span>เที่ยวรถ</span>
              <strong>{selectedVan.departureTime} น.</strong>
            </div>
            <div className="summary-row">
              <span>ที่นั่ง</span>
              <strong>{seat ? `หมายเลข ${seat}` : "ยังไม่ได้เลือก"}</strong>
            </div>
            <div className="field">
              <label>จุดขึ้นรถ</label>
              <select value={point} onChange={(e) => setPoint(e.target.value)}>
                {boardingPoints.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>จุดลงรถ</label>
              <select value={dropOffPoint} onChange={(e) => setDropOffPoint(e.target.value)}>
                {dropOffOptions.map((stop) => <option key={stop}>{stop}</option>)}
              </select>
            </div>
            <div className="field">
              <label>วันที่เดินทาง</label>
              <input
                type="date"
                value={date}
                disabled
              />
            </div>
            <div className="total-row">
              <span>ยอดชำระ</span>
              <strong>{selectedVan.price.toLocaleString()} บาท</strong>
            </div>
            <button
              className="btn primary full"
              disabled={!seat || !dropOffPoint}
              onClick={() => setStep(3)}
            >
              ไปต่อ <ArrowRight size={16} />
            </button>
          </aside>
        </div>
      )}
      {step === 3 && selectedVan && seat && (
        <div className="center-card card-panel">
          <div className="confirm-icon">
            <Check size={25} />
          </div>
          <p className="eyebrow accent">CHECK YOUR DETAILS</p>
          <h2>ตรวจสอบข้อมูลการจอง</h2>
          <p className="muted">กรุณาตรวจสอบรายละเอียดให้ถูกต้องก่อนยืนยัน</p>
          <div className="confirm-grid">
            <div>
              <span>เส้นทาง</span>
              <strong>กรุงเทพฯ → {selectedVan.destination}</strong>
            </div>
            <div>
              <span>วันและเวลา</span>
              <strong>
                {thaiDate(date)} · {selectedVan.departureTime} น.
              </strong>
            </div>
            <div>
              <span>ที่นั่ง</span>
              <strong>หมายเลข {seat}</strong>
            </div>
            <div>
              <span>จุดขึ้นรถ</span>
              <strong>{point}</strong>
            </div>
          </div>
          <div className="confirm-actions">
            <button className="btn outline" onClick={() => setStep(2)}>
              ย้อนกลับ
            </button>
            <button
              className="btn primary"
              onClick={createBooking}
              disabled={busy}
            >
              {busy ? "กำลังบันทึก..." : "ยืนยันการจอง"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      {step === 4 && booking && (
        <div className="center-card card-panel">
          <div className="payment-icon">
            <CircleDollarSign size={28} />
          </div>
          <p className="eyebrow accent">SECURE PAYMENT</p>
          <h2>ชำระเงินเพื่อยืนยันตั๋ว</h2>
          <p className="muted">
            สแกน QR พร้อมเพย์ด้านล่างเพื่อชำระเงิน ภายใน 5 นาที
          </p>
          <div className="fake-qr">
            <QRCodeSVG
              value={`promptpay-demo:${booking.id}:${selectedVan?.price || 0}`}
              size={112}
            />
          </div>
          <strong className="payment-amount">
            {selectedVan?.price.toLocaleString()} บาท
          </strong>
          <span className="booking-code">รหัสการจอง {booking.id}</span>
          <button className="btn primary" onClick={pay} disabled={busy}>
            {busy ? "กำลังตรวจสอบ..." : "จำลองการชำระเงิน"} <Check size={16} />
          </button>
        </div>
      )}
      {step === 5 && booking && (
        <div className="center-card card-panel success-card">
          <div className="success-icon">
            <Check size={30} />
          </div>
          <p className="eyebrow accent">BOOKING CONFIRMED</p>
          <h2>จองตั๋วสำเร็จแล้ว</h2>
          <p className="muted">ตั๋วอิเล็กทรอนิกส์ของคุณพร้อมใช้งานแล้ว</p>
          <div className="ticket-preview">
            <div>
              <span>รหัสตั๋ว</span>
              <strong>{booking.id}</strong>
            </div>
            <div>
              <span>ที่นั่ง</span>
              <strong>{booking.seatNo}</strong>
            </div>
            <div>
              <span>สถานะ</span>
              <strong className="green-text">ชำระแล้ว</strong>
            </div>
          </div>
          <button className="btn primary" onClick={onDone}>
            ดูตั๋วของฉัน <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function DriverOverview({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { currentUser, drivers, vans, bookings } = useVan();
  const driver = drivers.find(
    (item) =>
      item.phone === currentUser?.profile.phone ||
      item.name === currentUser?.profile.name,
  );
  const assigned = vans.filter((van) => !driver || van.driverId === driver.id);
  const activeTrips = assigned.filter((van) => van.status !== "Completed");
  const passengerBookings = bookings.filter(
    (booking) =>
      assigned.some((van) => van.id === booking.vanId) &&
      booking.status !== "Cancelled",
  );
  const nextTrip = activeTrips[0];

  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <p className="eyebrow accent">DRIVER DASHBOARD</p>
          <h2>สวัสดี, {currentUser?.profile.name.split(" ")[0] || "คนขับ"}</h2>
          <p className="muted">ตรวจตารางงาน ผู้โดยสาร และสถานะเที่ยวรถของคุณ</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate("scanner")}>
          <QrCode size={16} /> สแกนตั๋วผู้โดยสาร
        </button>
      </div>
      <div className="stats-grid">
        <Stat
          icon={BusFront}
          label="เที่ยวรถของฉัน"
          value={activeTrips.length}
          note="เที่ยวที่ยังดำเนินการอยู่"
          tone="blue"
        />
        <Stat
          icon={UsersRound}
          label="ผู้โดยสารทั้งหมด"
          value={passengerBookings.length}
          note="ไม่นับรายการที่ยกเลิก"
          tone="purple"
        />
        <Stat
          icon={Check}
          label="เช็กอินแล้ว"
          value={
            passengerBookings.filter((booking) => booking.status === "Boarded")
              .length
          }
          note="พร้อมออกเดินทาง"
          tone="mint"
        />
      </div>
      {nextTrip ? (
        <div className="card-panel driver-next-trip">
          <div className="section-head compact">
            <div>
              <p className="eyebrow accent">NEXT ASSIGNMENT</p>
              <h3>เที่ยวรถถัดไป</h3>
            </div>
            <span className={`status-pill ${statusClass(nextTrip.status)}`}>
              {statusText[nextTrip.status]}
            </span>
          </div>
          <div className="driver-route-summary">
            <div>
              <small>ต้นทาง</small>
              <strong>กรุงเทพฯ</strong>
            </div>
            <ArrowRight size={22} />
            <div>
              <small>ปลายทาง</small>
              <strong>{nextTrip.destination}</strong>
            </div>
            <div>
              <small>วันและเวลา</small>
              <strong>
                {thaiDate(nextTrip.date)} · {nextTrip.departureTime} น.
              </strong>
            </div>
            <div>
              <small>ทะเบียนรถ</small>
              <strong>{nextTrip.plateNo}</strong>
            </div>
          </div>
          <button
            className="btn primary"
            onClick={() => onNavigate("operations")}
          >
            เปิดหน้าจัดการเที่ยวรถ <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <EmptyState text="ยังไม่มีเที่ยวรถที่มอบหมายให้คุณ" />
      )}
    </div>
  );
}

function FinanceOverview({
  onNavigate,
}: {
  onNavigate: (key: NavKey) => void;
}) {
  const { transactions } = useVan();
  const success = transactions.filter(
    (transaction) => transaction.status === "Success",
  );
  const revenue = success.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const pending = transactions.filter(
    (transaction) => transaction.status === "Pending",
  );
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <p className="eyebrow accent">FINANCE OVERVIEW</p>
          <h2>ภาพรวมการเงิน</h2>
          <p className="muted">สรุปรายรับและสถานะธุรกรรมล่าสุดของ EveryVan</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate("reports")}>
          <CircleDollarSign size={16} /> ดูรายงานทั้งหมด
        </button>
      </div>
      <div className="stats-grid">
        <Stat
          icon={CircleDollarSign}
          label="รายรับสะสม"
          value={`${revenue.toLocaleString()} ฿`}
          note="จากรายการชำระสำเร็จ"
          tone="mint"
        />
        <Stat
          icon={Check}
          label="ชำระสำเร็จ"
          value={success.length}
          note="ธุรกรรมทั้งหมด"
          tone="blue"
        />
        <Stat
          icon={Clock3}
          label="รอดำเนินการ"
          value={pending.length}
          note="รายการที่ต้องติดตาม"
          tone="orange"
        />
      </div>
      <div className="card-panel table-panel">
        <div className="section-head compact">
          <div>
            <h3>ธุรกรรมล่าสุด</h3>
            <p className="muted">5 รายการล่าสุดจากระบบ</p>
          </div>
          <button className="text-button" onClick={() => onNavigate("reports")}>
            ดูทั้งหมด <ArrowRight size={15} />
          </button>
        </div>
        {transactions.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>ผู้โดยสาร</th>
                  <th>วันที่</th>
                  <th>ยอดเงิน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <strong>{transaction.receiptNo || transaction.id}</strong>
                      <small>Booking #{transaction.bookingId}</small>
                    </td>
                    <td>{transaction.passengerName}</td>
                    <td>
                      {thaiDate(transaction.date)}
                      <small>{transaction.time} น.</small>
                    </td>
                    <td>
                      <strong>{transaction.amount.toLocaleString()} บาท</strong>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${statusClass(transaction.status)}`}
                      >
                        {transaction.status === "Success"
                          ? "สำเร็จ"
                          : transaction.status === "Pending"
                            ? "รอดำเนินการ"
                            : "ยกเลิก"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="ยังไม่มีรายการชำระเงิน" />
        )}
      </div>
    </div>
  );
}

function AdminOverview({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { vans, bookings, transactions } = useVan();
  const revenue = transactions
    .filter((t) => t.status === "Success")
    .reduce((s, t) => s + t.amount, 0);
  const todayBookings = bookings.filter(
    (booking) => booking.date === bangkokDateInput(),
  ).length;
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <p className="eyebrow accent">ADMIN CONTROL CENTER</p>
          <h2>ภาพรวมระบบ</h2>
          <p className="muted">ติดตามการดำเนินงานของ EveryVan ในหน้าเดียว</p>
        </div>
        <button
          className="btn primary"
          onClick={() => onNavigate("operations")}
        >
          <Settings2 size={16} /> จัดการเที่ยวรถ
        </button>
      </div>
      <div className="stats-grid">
        <Stat
          icon={BusFront}
          label="เที่ยวรถทั้งหมด"
          value={vans.length}
          note="ที่สร้างในระบบ"
          tone="blue"
        />
        <Stat
          icon={Ticket}
          label="การจองวันนี้"
          value={todayBookings}
          note="รวมทุกสถานะ"
          tone="purple"
        />
        <Stat
          icon={CircleDollarSign}
          label="รายรับสะสม"
          value={`${revenue.toLocaleString()} ฿`}
          note="จากการชำระสำเร็จ"
          tone="mint"
        />
      </div>
      <div className="admin-grid">
        <div className="card-panel">
          <div className="section-head compact">
            <div>
              <h3>สถานะเที่ยวรถ</h3>
              <p className="muted">อัปเดตล่าสุดจากระบบ</p>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("operations")}
            >
              จัดการ <ArrowRight size={15} />
            </button>
          </div>
          {vans.map((v) => (
            <div className="admin-trip-row" key={v.id}>
              <div className="mini-icon">
                <BusFront size={18} />
              </div>
              <div>
                <strong>กรุงเทพฯ → {v.destination}</strong>
                <small>
                  {thaiDate(v.date)} · {v.departureTime} น. · {v.plateNo}
                </small>
              </div>
              <div className="admin-progress">
                <span>
                  {v.occupiedSeats.length}/{v.capacity} ที่นั่ง
                </span>
                <div>
                  <i
                    style={{
                      width: `${Math.min(100, (v.occupiedSeats.length / v.capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <span className={`status-pill ${statusClass(v.status)}`}>
                {statusText[v.status]}
              </span>
            </div>
          ))}
          {vans.length === 0 && <EmptyState text="ยังไม่มีเที่ยวรถในระบบ" />}
        </div>
        <div className="card-panel highlight-panel">
          <div className="panel-icon">
            <CircleDollarSign size={21} />
          </div>
          <span className="eyebrow">REVENUE THIS MONTH</span>
          <strong>
            {revenue.toLocaleString()} <small>บาท</small>
          </strong>
          <p>รายรับจากรายการชำระเงินที่สำเร็จ</p>
          <button
            className="btn light full"
            onClick={() => onNavigate("reports")}
          >
            ดูรายงานการเงิน
          </button>
        </div>
      </div>
    </div>
  );
}

const employeeRoleLabel: Record<EmployeeRole, string> = {
  staff: "พนักงานจัดคิว",
  dispatcher: "พนักงานควบคุมคิว",
  accountant: "เจ้าหน้าที่บัญชี",
  driver: "คนขับรถ",
};

type AccountFormState = Omit<EmployeeAccountInput, "role"> & {
  role: EmployeeRole | "passenger";
  thaiId: string;
};

const newEmployeeForm = (): AccountFormState => ({
  username: "",
  password: "",
  name: "",
  dob: "",
  phone: "",
  email: "",
  role: "staff",
  department: "ฝ่ายจัดคิวรถ",
  employeeId: "",
  licenseId: "",
  thaiId: "",
  isActive: true,
});

function AdminAccountsPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filter, setFilter] = useState<"all" | "employees" | "customers">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<AccountFormState>(newEmployeeForm);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await api.admin.listUsers());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลบัญชีไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(newEmployeeForm());
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    if (user.role === "admin") return;
    setEditing(user);
    setForm({
      username: user.username,
      password: "",
      name: user.name,
      dob: user.dob,
      phone: user.phone,
      email: user.email,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      licenseId: user.licenseId,
      thaiId: user.thaiId,
      isActive: user.isActive,
    });
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload: ManagedAccountUpdateInput = { ...form };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.admin.updateUser(editing.id, payload);
        setMessage(
          editing.role === "passenger"
            ? "บันทึกข้อมูลบัญชีลูกค้าแล้ว"
            : "บันทึกข้อมูลบัญชีพนักงานแล้ว",
        );
      } else {
        if (form.role === "passenger")
          throw new Error("เพิ่มบัญชีลูกค้าใหม่ผ่านหน้าสมัครสมาชิก");
        await api.admin.createEmployee({ ...form, role: form.role });
        setMessage("สร้างบัญชีพนักงานใหม่แล้ว");
      }
      setFormOpen(false);
      setEditing(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const toggleAccount = async (user: ManagedUser) => {
    setActionId(user.id);
    setError("");
    setMessage("");
    try {
      await api.admin.updateUser(user.id, { isActive: !user.isActive });
      setMessage(
        user.isActive
          ? `ปิดใช้งานบัญชี ${user.username} แล้ว`
          : `เปิดใช้งานบัญชี ${user.username} แล้ว`,
      );
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนสถานะบัญชีไม่สำเร็จ");
    } finally {
      setActionId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesGroup =
      filter === "all" ||
      (filter === "customers" && user.role === "passenger") ||
      (filter === "employees" && user.role !== "passenger");
    const matchesSearch =
      !normalizedSearch ||
      [user.name, user.username, user.email, user.phone]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesGroup && matchesSearch;
  });
  const employeeCount = users.filter(
    (user) => user.role !== "passenger" && user.role !== "admin",
  ).length;
  const customerCount = users.filter((user) => user.role === "passenger").length;
  const inactiveCount = users.filter((user) => !user.isActive).length;

  return (
    <div className="page-stack account-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">ACCOUNT MANAGEMENT</p>
          <h2>จัดการบัญชีผู้ใช้งาน</h2>
          <p className="muted">
            จัดการบัญชีพนักงานและแก้ไขข้อมูลบัญชีลูกค้าในระบบ
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <UsersRound size={17} /> เพิ่มบัญชีพนักงาน
        </button>
      </div>

      <div className="stats-grid account-stats">
        <Stat
          icon={ShieldCheck}
          label="บัญชีพนักงาน"
          value={employeeCount}
          note="ไม่รวมผู้ดูแลระบบ"
          tone="blue"
        />
        <Stat
          icon={UsersRound}
          label="บัญชีลูกค้า"
          value={customerCount}
          note="แอดมินแก้ไขข้อมูลได้"
          tone="purple"
        />
        <Stat
          icon={X}
          label="ปิดใช้งาน"
          value={inactiveCount}
          note="ไม่สามารถเข้าสู่ระบบ"
          tone="orange"
        />
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {formOpen && (
        <form className="card-panel account-form" onSubmit={saveAccount}>
          <div className="account-form-head">
            <div>
              <p className="eyebrow accent">
                {editing?.role === "passenger"
                  ? "EDIT CUSTOMER"
                  : editing
                    ? "EDIT EMPLOYEE"
                    : "NEW EMPLOYEE"}
              </p>
              <h3>
                {editing
                  ? `แก้ไขบัญชี ${editing.username}`
                  : "เพิ่มบัญชีพนักงาน"}
              </h3>
              <p className="muted">
                {editing
                  ? "แก้ข้อมูลหรือกำหนดรหัสผ่านใหม่ได้ โดยเว้นช่องรหัสผ่านไว้หากไม่ต้องการเปลี่ยน"
                  : "พนักงานสามารถใช้ชื่อผู้ใช้และรหัสผ่านนี้เข้าสู่ระบบได้ทันที"}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="ปิดแบบฟอร์ม"
              onClick={() => setFormOpen(false)}
            >
              <X size={19} />
            </button>
          </div>
          <div className="account-form-grid">
            <div className="field">
              <label>ชื่อ-นามสกุล</label>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label>ประเภทบัญชี / บทบาท</label>
              {form.role === "passenger" ? (
                <input value="ลูกค้า / ผู้โดยสาร" disabled />
              ) : (
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      role: event.target.value as EmployeeRole,
                      department:
                        event.target.value === "driver" ? "" : form.department,
                      employeeId:
                        event.target.value === "driver" ? "" : form.employeeId,
                      licenseId:
                        event.target.value === "driver" ? form.licenseId : "",
                    })
                  }
                >
                  {Object.entries(employeeRoleLabel).map(([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="field">
              <label>ชื่อผู้ใช้</label>
              <input
                value={form.username}
                onChange={(event) =>
                  setForm({
                    ...form,
                    username: event.target.value.toLowerCase().replace(/\s/g, ""),
                  })
                }
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label>{editing ? "รหัสผ่านใหม่ (ไม่บังคับ)" : "รหัสผ่าน"}</label>
              <input
                type="password"
                value={form.password || ""}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                autoComplete="new-password"
                minLength={8}
                required={!editing}
              />
            </div>
            <div className="field">
              <label>อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label>เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value.replace(/\D/g, ""),
                  })
                }
                autoComplete="tel"
                maxLength={10}
              />
            </div>
            <div className="field">
              <label>วันเกิด</label>
              <input
                type="date"
                max={bangkokDateInput()}
                value={form.dob}
                onChange={(event) => setForm({ ...form, dob: event.target.value })}
              />
            </div>
            {form.role === "passenger" ? (
              <div className="field">
                <label>เลขบัตรประชาชน 13 หลัก</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]{13}"
                  maxLength={13}
                  value={form.thaiId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      thaiId: event.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </div>
            ) : form.role === "driver" ? (
              <div className="field">
                <label>เลขใบอนุญาตขับรถ</label>
                <input
                  value={form.licenseId}
                  onChange={(event) =>
                    setForm({ ...form, licenseId: event.target.value })
                  }
                  required
                />
              </div>
            ) : (
              <>
                <div className="field">
                  <label>รหัสพนักงาน</label>
                  <input
                    value={form.employeeId}
                    onChange={(event) =>
                      setForm({ ...form, employeeId: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>แผนก</label>
                  <input
                    value={form.department}
                    onChange={(event) =>
                      setForm({ ...form, department: event.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn outline"
              onClick={() => setFormOpen(false)}
            >
              ยกเลิก
            </button>
            <button className="btn primary" disabled={busy}>
              <Check size={16} /> {busy ? "กำลังบันทึก..." : "บันทึกบัญชี"}
            </button>
          </div>
        </form>
      )}

      <section className="card-panel account-directory">
        <div className="account-toolbar">
          <div className="account-search">
            <Search size={17} />
            <input
              aria-label="ค้นหาบัญชี"
              placeholder="ค้นหาชื่อ ชื่อผู้ใช้ อีเมล หรือเบอร์โทร"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="account-filters" aria-label="กรองประเภทบัญชี">
            {[
              ["all", "ทั้งหมด"],
              ["employees", "พนักงาน"],
              ["customers", "ลูกค้า"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() =>
                  setFilter(value as "all" | "employees" | "customers")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="account-list">
          <div className="account-column-heads" aria-hidden="true">
            <span>บัญชีผู้ใช้</span>
            <span>ประเภท / สถานะ</span>
            <span>ข้อมูลติดต่อ</span>
            <span>ข้อมูลอ้างอิง</span>
            <span>การจัดการ</span>
          </div>
          {loading ? (
            <div className="account-loading">กำลังโหลดบัญชี...</div>
          ) : filteredUsers.length ? (
            filteredUsers.map((user) => {
              const isCustomer = user.role === "passenger";
              const isAdmin = user.role === "admin";
              return (
                <article className="account-row" key={user.id}>
                  <div className="account-identity">
                    <span className="avatar">{user.name.slice(0, 1)}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>@{user.username}</small>
                    </div>
                  </div>
                  <div className="account-role">
                    <span className={`role-badge ${user.role}`}>
                      {roleLabel[user.role]}
                    </span>
                    <span
                      className={`account-status ${user.isActive ? "active" : "inactive"}`}
                    >
                      {user.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                    </span>
                  </div>
                  <div className="account-contact">
                    <strong>{user.email}</strong>
                    <small>{user.phone || "ไม่ระบุเบอร์โทร"}</small>
                  </div>
                  <div className="account-meta">
                    <strong>
                      {isCustomer
                        ? user.thaiId || "ไม่ระบุเลขบัตร"
                        : isAdmin
                          ? "บัญชีผู้ดูแลหลัก"
                          : user.role === "driver"
                            ? user.licenseId
                            : user.employeeId}
                    </strong>
                    <small>
                      {isCustomer
                        ? "เลขบัตรประชาชน"
                        : user.department || roleLabel[user.role]}
                    </small>
                  </div>
                  <div className="account-actions">
                    {isAdmin ? (
                      <span className="read-only-label">
                        บัญชีหลัก
                      </span>
                    ) : (
                      <>
                        <button
                          className="btn outline small"
                          onClick={() => openEdit(user)}
                        >
                          แก้ไข
                        </button>
                        <button
                          className={`btn small ${user.isActive ? "danger-outline" : "activate"}`}
                          disabled={actionId === user.id}
                          onClick={() => void toggleAccount(user)}
                        >
                          {actionId === user.id
                            ? "กำลังบันทึก"
                            : user.isActive
                              ? "ปิดใช้งาน"
                              : "เปิดใช้งาน"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState text="ไม่พบบัญชีที่ตรงกับการค้นหา" />
          )}
        </div>
      </section>
    </div>
  );
}

function QueueOverview({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { vans, bookings } = useVan();
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <p className="eyebrow accent">QUEUE CONTROL</p>
          <h2>ภาพรวมคิวรถ</h2>
          <p className="muted">
            จัดเวลาเที่ยวรถและติดตามจำนวนที่นั่งว่างของแต่ละรอบ
          </p>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          icon={BusFront}
          label="เที่ยวรถที่เปิด"
          value={vans.filter((v) => v.status === "Waiting").length}
          note="พร้อมจัดคิว"
          tone="blue"
        />
        <Stat
          icon={UsersRound}
          label="ผู้โดยสารที่จอง"
          value={bookings.filter((b) => b.status !== "Cancelled").length}
          note="รวมทุกเที่ยว"
          tone="purple"
        />
        <Stat
          icon={Grid2X2}
          label="ที่นั่งว่าง"
          value={vans.reduce(
            (sum, v) => sum + v.capacity - v.occupiedSeats.length,
            0,
          )}
          note="เลือกเที่ยวรถได้"
          tone="mint"
        />
      </div>
      <div className="card-panel">
        <div className="section-head compact">
          <div>
            <h3>สถานะรถและที่นั่งว่าง</h3>
            <p className="muted">อัปเดตจากรอบเดินรถล่าสุด</p>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("operations")}
          >
            จัดการเวลา <ArrowRight size={15} />
          </button>
        </div>
        {vans.map((v) => (
          <div className="admin-trip-row" key={v.id}>
            <div className="mini-icon">
              <BusFront size={18} />
            </div>
            <div>
              <strong>กรุงเทพฯ → {v.destination}</strong>
              <small>
                {thaiDate(v.date)} · ออก {v.departureTime} น. · ถึง{" "}
                {v.arrivalTime || "-"} น. · {v.plateNo}
              </small>
            </div>
            <strong>ว่าง {v.capacity - v.occupiedSeats.length}</strong>
            <span className={`status-pill ${statusClass(v.status)}`}>
              {statusText[v.status]}
            </span>
          </div>
        ))}
        {vans.length === 0 && <EmptyState text="ยังไม่มีเที่ยวรถสำหรับจัดคิว" />}
      </div>
    </div>
  );
}

function ReportsPage() {
  const { transactions } = useVan();
  const success = transactions.filter((t) => t.status === "Success");
  const revenue = success.reduce((sum, t) => sum + t.amount, 0);
  const today = bangkokDateInput();
  const todayRevenue = success
    .filter((t) => t.date === today)
    .reduce((sum, t) => sum + t.amount, 0);
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">FINANCE REPORT</p>
          <h2>รายงานการเงิน</h2>
          <p className="muted">ตรวจสอบรายการชำระเงินและรายรับของระบบ</p>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          icon={CircleDollarSign}
          label="รายรับทั้งหมด"
          value={`${revenue.toLocaleString()} ฿`}
          note="รายการที่ชำระสำเร็จ"
          tone="mint"
        />
        <Stat
          icon={CalendarDays}
          label="รายรับวันนี้"
          value={`${todayRevenue.toLocaleString()} ฿`}
          note={thaiDate(today)}
          tone="blue"
        />
        <Stat
          icon={Ticket}
          label="ธุรกรรมสำเร็จ"
          value={success.length}
          note={`จากทั้งหมด ${transactions.length} รายการ`}
          tone="purple"
        />
      </div>
      <div className="card-panel table-panel">
        <div className="section-head compact">
          <h3>รายการล่าสุด</h3>
          <span className="filter-chip">{transactions.length} รายการ</span>
        </div>
        {transactions.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>ผู้โดยสาร</th>
                  <th>วันที่</th>
                  <th>ยอดเงิน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.receiptNo || t.id}</strong>
                      <small>Booking #{t.bookingId}</small>
                    </td>
                    <td>{t.passengerName}</td>
                    <td>
                      {thaiDate(t.date)}
                      <small>{t.time} น.</small>
                    </td>
                    <td>
                      <strong>{t.amount.toLocaleString()} บาท</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(t.status)}`}>
                        {t.status === "Success"
                          ? "สำเร็จ"
                          : t.status === "Pending"
                            ? "รอดำเนินการ"
                            : "ยกเลิก"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="ยังไม่มีรายการชำระเงิน" />
        )}
      </div>
    </div>
  );
}

function FollowersPage() {
  const { currentUser } = useVan();
  const [data, setData] = useState<{ outgoing: any[]; incoming: any[]; tracking: any[] }>({ outgoing: [], incoming: [], tracking: [] });
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try { setData(await api.followers.list()); } catch (e) { setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"); }
  };
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const add = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    try { await api.followers.add(phone, relationship); setPhone(""); setRelationship(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ"); }
  };
  return <div className="page-stack">
    <div className="page-intro"><div><p className="eyebrow accent">TRAVEL FOLLOWERS</p><h2>ผู้ติดตามการเดินทาง</h2><p className="muted">ให้คนที่ไว้ใจติดตามสถานะรถของคุณหลังตอบรับคำขอ</p></div></div>
    {currentUser?.role === "passenger" && <form className="card-panel form-grid" onSubmit={add}>
      <div className="field"><label>เบอร์โทรผู้ติดตาม</label><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} required /></div>
      <div className="field"><label>ความสัมพันธ์ (ไม่เกิน 10 ตัวอักษร)</label><input value={relationship} maxLength={10} onChange={(e) => setRelationship(e.target.value)} placeholder="เช่น คุณแม่" required /></div>
      <div className="form-actions"><button className="btn primary">ส่งคำขอติดตาม</button></div>
    </form>}
    {error && <div className="alert error">{error}</div>}
    {!!data.incoming.length && <section className="card-panel"><h3>คำขอที่รอการตอบรับ</h3>{data.incoming.map((item) => <div className="passenger-row" key={item.id}><div className="avatar small">{item.name.slice(0, 1)}</div><div><strong>{item.name}</strong><small>{item.relationship} · {item.phone}</small></div><button className="btn small primary" onClick={() => void api.followers.respond(item.id, "accepted").then(load)}>Accept</button><button className="btn small outline" onClick={() => void api.followers.respond(item.id, "denied").then(load)}>Deny</button></div>)}</section>}
    <section className="card-panel"><h3>สถานะรถของคนที่ติดตาม</h3><p className="muted">อัปเดตตำแหน่งล่าสุดอัตโนมัติทุก 5 วินาที</p>{data.tracking.map((item) => <div className="passenger-row" key={item.id}><div className="avatar small">{item.name.slice(0, 1)}</div><div><strong>{item.name} <span className="muted">({item.relationship})</span></strong><small>{item.trip_status ? `รถถึง ${item.current_stop || "ระหว่างเส้นทาง"} · ปลายทาง ${item.destination} · ${item.trip_status}` : "ยังไม่มีเที่ยวรถที่กำลังเดินทาง"}</small>{item.current_stop_updated_at && <small>อัปเดตล่าสุด {new Date(item.current_stop_updated_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</small>}</div></div>)}{!data.tracking.length && <EmptyState text="ยังไม่มีคนที่อนุญาตให้คุณติดตาม" />}</section>
    {currentUser?.role === "passenger" && <section className="card-panel"><h3>ผู้ติดตามที่คุณเพิ่ม</h3>{data.outgoing.map((item) => <div className="passenger-row" key={item.id}><div className="avatar small">{item.name.slice(0, 1)}</div><div><strong>{item.name}</strong><small>{item.relationship} · สถานะ {item.status}</small></div><button className="btn small danger-outline" onClick={() => void api.followers.remove(item.id).then(load)}>ลบ</button></div>)}{!data.outgoing.length && <EmptyState text="ยังไม่ได้เพิ่มผู้ติดตาม" />}</section>}
  </div>;
}

function ProfilePage() {
  const { currentUser, updateUserProfile, changeOwnPassword } = useVan();
  const [form, setForm] = useState(currentUser?.profile);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  if (!form) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await updateUserProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    setPasswordBusy(true);
    try {
      await changeOwnPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ",
      );
    } finally {
      setPasswordBusy(false);
    }
  };
  return (
    <div className="page-stack narrow">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">ACCOUNT SETTINGS</p>
          <h2>ข้อมูลส่วนตัว</h2>
          <p className="muted">ข้อมูลนี้จะถูกใช้บนตั๋วและการติดต่อจากระบบ</p>
        </div>
      </div>
      <form className="card-panel profile-form" onSubmit={submit}>
        <div className="profile-cover">
          <div className="avatar large">{form.name.slice(0, 1)}</div>
          <div>
            <h3>{form.name}</h3>
            <p className="muted">
              {currentUser?.username} ·{" "}
              {roleLabel[currentUser?.role || "passenger"]}
            </p>
          </div>
        </div>
        {error && <div className="profile-alert alert error">{error}</div>}
        <div className="form-grid">
          <div className="field">
            <label>ชื่อ-นามสกุล</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label>เบอร์โทรศัพท์</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
              }
              autoComplete="tel"
              minLength={9}
              maxLength={10}
              required
            />
          </div>
          <div className="field">
            <label>อีเมล</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label>วันเกิด</label>
            <input
              type="date"
              max={bangkokDateInput()}
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>
          {currentUser?.role === "passenger" && (
            <div className="field">
              <label>เลขบัตรประชาชน 13 หลัก</label>
              <input
                inputMode="numeric"
                pattern="[0-9]{13}"
                value={form.thaiId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    thaiId: e.target.value.replace(/\D/g, ""),
                  })
                }
                maxLength={13}
                required
              />
            </div>
          )}
        </div>
        <div className="form-actions">
          {saved && (
            <span className="saved">
              <Check size={15} /> บันทึกข้อมูลแล้ว
            </span>
          )}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </form>
      <form
        className="card-panel profile-password-form"
        onSubmit={submitPassword}
      >
        <div className="password-card-head">
          <div className="panel-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3>เปลี่ยนรหัสผ่าน</h3>
            <p className="muted">
              ใช้ได้กับทุกบทบาท และระบบจะออกจากระบบในอุปกรณ์อื่นเพื่อความปลอดภัย
            </p>
          </div>
        </div>
        {passwordError && (
          <div className="profile-alert alert error">{passwordError}</div>
        )}
        {passwordSaved && (
          <div className="profile-alert alert success">
            เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
          </div>
        )}
        <div className="password-form-grid">
          <div className="field">
            <label>รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              autoComplete="current-password"
              required
            />
          </div>
          <div className="field">
            <label>รหัสผ่านใหม่</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label>ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>
        <div className="form-actions">
          <span className="muted">อย่างน้อย 8 ตัวอักษร</span>
          <button className="btn primary" type="submit" disabled={passwordBusy}>
            {passwordBusy ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <BusFront size={26} />
      <p>{text}</p>
    </div>
  );
}

function Dashboard() {
  const { currentUser } = useVan();
  return currentUser ? <DashboardContent /> : <AuthView />;
}
function DashboardContent() {
  const { currentUser, dataMode } = useVan();
  const [active, setActive] = useState<NavKey>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bookingVan, setBookingVan] = useState<Van>();
  const role = currentUser!.role;
  const navigate = (key: NavKey) => {
    if (key === "scanner" && role !== "driver") {
      setActive("overview");
      return;
    }
    if (key !== "book") setBookingVan(undefined);
    setActive(key);
  };
  const chooseTrip = (van: Van) => {
    setBookingVan(van);
    setActive("book");
  };
  const title =
    active === "book"
      ? "จองตั๋วรถตู้"
      : active === "tickets"
        ? "ตั๋วของฉัน"
        : active === "operations"
          ? role === "driver"
            ? "ผู้โดยสารขึ้นรถ"
            : "จัดการเที่ยวรถ"
          : active === "create-trip"
            ? "เพิ่มเที่ยวรถ"
            : active === "scanner"
              ? "สแกน QR ตั๋ว"
              : active === "reports"
                ? "รายงานการเงิน"
                : active === "accounts"
                  ? "จัดการบัญชี"
                : active === "followers"
                  ? "ผู้ติดตามการเดินทาง"
                : active === "profile"
                  ? "ข้อมูลส่วนตัว"
                  : role === "accountant"
                    ? "ภาพรวมการเงิน"
                    : role === "staff" || role === "dispatcher"
                      ? "ภาพรวมคิวรถ"
                      : "ภาพรวม";
  const content =
    active === "book" ? (
      <BookingPage
        initialVan={bookingVan}
        onDone={() => {
          setBookingVan(undefined);
          setActive("tickets");
        }}
      />
    ) : active === "tickets" ? (
      <TicketsPageV2 />
    ) : active === "followers" ? (
      <FollowersPage />
    ) : active === "profile" ? (
      <ProfilePage />
    ) : active === "operations" ? (
      <OperationsPage />
    ) : active === "create-trip" ? (
      <CreateTripPage />
    ) : active === "scanner" ? (
      <ScannerPage />
    ) : active === "reports" ? (
      <ReportsPage />
    ) : active === "accounts" ? (
      <AdminAccountsPage />
    ) : role === "passenger" ? (
      <PassengerOverview onNavigate={navigate} onBook={chooseTrip} />
    ) : role === "driver" ? (
      <DriverOverview onNavigate={navigate} />
    ) : role === "accountant" ? (
      <FinanceOverview onNavigate={navigate} />
    ) : role === "staff" || role === "dispatcher" ? (
      <QueueOverview onNavigate={navigate} />
    ) : (
      <AdminOverview onNavigate={navigate} />
    );
  return (
    <div className="app-frame">
      <Sidebar
        active={active}
        onChange={navigate}
        mobileOpen={mobileOpen}
        close={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          className="sidebar-backdrop mobile-only"
          aria-label="ปิดเมนู"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="main-new">
        <Topbar title={title} openMenu={() => setMobileOpen(true)} />
        {dataMode === "offline" && (
          <div className="demo-mode-banner" role="status">
            โหมดข้อมูลจำลอง — API หรือ PostgreSQL ยังไม่พร้อม ข้อมูลชุดนี้เก็บเฉพาะในเบราว์เซอร์
          </div>
        )}
        <div className="content-new">{content}</div>
      </main>
    </div>
  );
}

function App() {
  return (
    <VanProvider>
      <Dashboard />
    </VanProvider>
  );
}
export default App;
function TicketsPageV2() {
  const {
    currentUser,
    bookings,
    vans,
    drivers,
    cancelBooking,
    addReview,
  } = useVan();
  const [reviewing, setReviewing] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewedBooking, setReviewedBooking] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const mine = bookings.filter(
    (b) => b.passengerPhone === currentUser?.profile.phone,
  );
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">MY TICKETS</p>
          <h2>ตั๋วของฉัน</h2>
          <p className="muted">
            แสดงตั๋วอิเล็กทรอนิกส์ สถานะชำระเงิน และใบเสร็จ
          </p>
        </div>
        <div className="filter-chip">
          <Ticket size={15} /> {mine.length} รายการ
        </div>
      </div>
      <div className="ticket-list">
        {mine.map((b) => {
          const van = vans.find((v) => v.id === b.vanId);
          const driver = drivers.find(
            (d) => d.id === (van?.driverId || b.driverId),
          );
          const submitReview = async () => {
            if (!driver || !reviewComment.trim()) return;
            setReviewBusy(true);
            setReviewError("");
            try {
              await addReview(driver.id, b.id, rating, reviewComment.trim());
              setReviewMessage(`ส่งรีวิวให้คุณ${driver.name}เรียบร้อยแล้ว`);
              setReviewedBooking(b.id);
              setReviewing("");
              setReviewComment("");
              setRating(5);
            } catch (error) {
              setReviewError(
                error instanceof Error ? error.message : "ส่งรีวิวไม่สำเร็จ",
              );
            } finally {
              setReviewBusy(false);
            }
          };
          return (
            <article className="e-ticket" key={b.id}>
              <div className="ticket-main">
                <div className="ticket-status">
                  <span className={`status-pill ${statusClass(b.status)}`}>
                    {statusText[b.status]}
                  </span>
                  <span>Booking #{b.id}</span>
                </div>
                <div className="ticket-route-large">
                  <div>
                    <small>ต้นทาง</small>
                    <strong>กรุงเทพฯ</strong>
                  </div>
                  <ArrowRight size={20} />
                  <div>
                    <small>ปลายทาง</small>
                    <strong>{van?.destination || b.destination || "ไม่ระบุ"}</strong>
                  </div>
                </div>
                <div className="ticket-details">
                  <span>
                    <CalendarDays size={15} /> {thaiDate(b.date)}
                  </span>
                  <span>
                    <Clock3 size={15} /> {van?.departureTime || b.timeSlot}
                  </span>
                  <span>
                    <Grid2X2 size={15} /> ที่นั่ง {b.seatNo}
                  </span>
                  <span>
                    <MapPin size={15} /> ลงที่ {b.dropOffPoint || "ปลายทาง"}
                  </span>
                </div>
                <div className="ticket-driver">
                  {driver?.avatar ? (
                    <img src={driver.avatar} alt={driver.name} />
                  ) : (
                    <span className="avatar small">
                      {driver?.name.slice(0, 1) || "-"}
                    </span>
                  )}
                  <span>
                    รถ {van?.plateNo || b.plateNo || "-"} · คนขับ{" "}
                    {driver?.name || b.driverName || "ไม่ระบุ"}
                  </span>
                </div>
                {b.status === "Pending Payment" && (
                  <div className="ticket-actions">
                    <button
                      className="btn danger-outline"
                      onClick={() => cancelBooking(b.id)}
                    >
                      ยกเลิกการจอง
                    </button>
                    <span>กรุณาชำระเงินภายใน 5 นาที</span>
                  </div>
                )}
                {b.receiptNo && (
                  <div className="ticket-actions">
                    <span className="green-text">
                      ชำระเงินสำเร็จ · ใบเสร็จ {b.receiptNo} ·{" "}
                      {(b.amount || van?.price || 0).toLocaleString()} บาท
                    </span>
                  </div>
                )}
                {b.status === "Completed" && driver && (
                  <div className="ticket-review">
                    {reviewing === b.id ? (
                      <>
                        <div className="field review-rating">
                          <label>คะแนนคนขับ</label>
                          <select
                            value={rating}
                            onChange={(event) =>
                              setRating(Number(event.target.value))
                            }
                          >
                            <option value={5}>5 — ดีเยี่ยม</option>
                            <option value={4}>4 — ดีมาก</option>
                            <option value={3}>3 — ปานกลาง</option>
                            <option value={2}>2 — ควรปรับปรุง</option>
                            <option value={1}>1 — ไม่พอใจ</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>ความคิดเห็น</label>
                          <textarea
                            value={reviewComment}
                            onChange={(event) =>
                              setReviewComment(event.target.value)
                            }
                            placeholder="เล่าประสบการณ์การเดินทางของคุณ"
                          />
                        </div>
                        <div className="review-actions">
                          <button
                            className="btn outline small"
                            onClick={() => setReviewing("")}
                          >
                            ยกเลิก
                          </button>
                          <button
                            className="btn primary small"
                            disabled={!reviewComment.trim() || reviewBusy}
                            onClick={submitReview}
                          >
                            {reviewBusy ? "กำลังส่ง..." : "ส่งรีวิว"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="btn outline small"
                        onClick={() => {
                          setReviewing(b.id);
                          setReviewMessage("");
                          setReviewError("");
                          setReviewedBooking("");
                        }}
                      >
                        ให้คะแนนคนขับ
                      </button>
                    )}
                  </div>
                )}
                {reviewMessage &&
                  reviewedBooking === b.id &&
                  b.status === "Completed" && (
                  <div className="saved">
                    <Check size={15} /> {reviewMessage}
                  </div>
                  )}
                {reviewError && reviewing === b.id && (
                  <div className="alert error">{reviewError}</div>
                )}
              </div>
              <div className="ticket-qr">
                {b.qrCode ? (
                  <QRCodeSVG value={b.qrCode} size={112} />
                ) : (
                  <div className="qr-pattern">
                    <QrCode size={68} />
                  </div>
                )}
                <small>
                  {b.ticketId || b.qrCode
                    ? "สแกน QR เมื่อขึ้นรถ"
                    : "ชำระเงินเพื่อรับ QR"}
                </small>
              </div>
            </article>
          );
        })}
        {mine.length === 0 && <EmptyState text="ยังไม่มีตั๋วในบัญชีของคุณ" />}
      </div>
    </div>
  );
}
function CreateTripPage() {
  const { drivers, createVanSchedule } = useVan();
  const [destination, setDestination] = useState("พัทยา");
  const [departure, setDeparture] = useState(
    bangkokDateTimeInput(new Date(Date.now() + 3600000)),
  );
  const [vehicle, setVehicle] = useState("Toyota Commuter");
  const [plate, setPlate] = useState("");
  const seats = vehicleCapacity(vehicle);
  const [price, setPrice] = useState(220);
  const [driverId, setDriverId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const [date, time] = departure.split("T");
      await createVanSchedule({
        destination,
        departureTime: time,
        date,
        vanType: vehicle,
        plateNo: plate,
        capacity: seats,
        driverId,
        price,
      });
      setMessage(
        "เพิ่มเที่ยวรถเรียบร้อยแล้ว รายการใหม่แสดงในหน้าจัดการเที่ยวรถทันที",
      );
      setPlate("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ไม่สามารถเพิ่มเที่ยวรถได้",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack narrow">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">TRIP MANAGEMENT</p>
          <h2>เพิ่มเที่ยวรถ</h2>
          <p className="muted">กำหนดรถ คนขับ ปลายทาง และเวลาออกเดินทาง</p>
        </div>
      </div>
      <form className="card-panel trip-form" onSubmit={submit}>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="scan-result valid">{message}</div>}
        <div className="form-grid">
          <div className="field">
            <label>ปลายทาง</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>เวลาออกเดินทาง</label>
            <input
              type="datetime-local"
              min={bangkokDateTimeInput()}
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>ประเภทรถ</label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            >
              {Object.entries(VEHICLE_CAPACITIES).map(([type, capacity]) => (
                <option value={type} key={type}>
                  {type} ({capacity} ที่นั่ง)
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>ทะเบียนรถ</label>
            <input
              placeholder="เช่น 10-1234 กรุงเทพฯ"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>จำนวนที่นั่ง</label>
            <input
              type="number"
              value={seats}
              readOnly
            />
            <small className="field-hint">กำหนดตามประเภทรถที่เลือกโดยอัตโนมัติ</small>
          </div>
          <div className="field">
            <label>ค่าโดยสารต่อที่นั่ง (บาท)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </div>
          <div className="field">
            <label>คนขับรถ</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
            >
              <option value="">เลือกคนขับ</option>
              {drivers.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn primary" disabled={!driverId || busy}>
            {busy ? "กำลังบันทึก..." : "บันทึกเที่ยวรถ"}{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
function ScannerPage() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{
    valid: boolean;
    payment_status: string;
    ticket?: { seat_number?: string };
  } | null>(null);
  const [error, setError] = useState("");
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "starting" | "active" | "error"
  >("idle");
  const [checking, setChecking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastFrameRef = useRef(0);

  const releaseCamera = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const check = async (code = value) => {
    const normalizedCode = code.trim();
    if (!normalizedCode || processingRef.current) return;
    processingRef.current = true;
    setChecking(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.scanner.scan(normalizedCode));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ตรวจสอบ QR ไม่สำเร็จ");
    } finally {
      processingRef.current = false;
      setChecking(false);
    }
  };

  const stopCamera = () => {
    releaseCamera();
    setCameraStatus("idle");
  };

  const startCamera = async () => {
    releaseCamera();
    setError("");
    setResult(null);
    setValue("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setError(
        "อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับกล้อง กรุณาเปิดผ่าน Chrome หรือ Safari บน HTTPS/localhost",
      );
      return;
    }
    setCameraStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("camera_not_ready");
      video.srcObject = stream;
      await video.play();
      const { default: decodeQr } = await import("jsqr");
      setCameraStatus("active");
      lastFrameRef.current = 0;

      const scanFrame = (timestamp: number) => {
        if (!streamRef.current || !videoRef.current || !canvasRef.current)
          return;
        if (
          timestamp - lastFrameRef.current >= 160 &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0
        ) {
          lastFrameRef.current = timestamp;
          const scale = Math.min(1, 960 / video.videoWidth);
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const detected = decodeQr(image.data, image.width, image.height, {
              inversionAttempts: "attemptBoth",
            })?.data;
            if (detected) {
              setValue(detected);
              releaseCamera();
              setCameraStatus("idle");
              void check(detected);
              return;
            }
          }
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (cameraError) {
      releaseCamera();
      setCameraStatus("error");
      const name =
        cameraError instanceof DOMException ? cameraError.name : "CameraError";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณากดอนุญาตกล้องในการตั้งค่าเบราว์เซอร์แล้วลองใหม่",
        );
      } else if (name === "NotFoundError") {
        setError("ไม่พบกล้องบนอุปกรณ์นี้");
      } else {
        setError("เปิดกล้องไม่สำเร็จ กรุณาปิดแอปอื่นที่กำลังใช้กล้องแล้วลองใหม่");
      }
    }
  };

  return (
    <div className="page-stack narrow">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">TICKET VALIDATION</p>
          <h2>สแกน QR ตั๋วด้วยกล้อง</h2>
          <p className="muted">
            หันกล้องไปที่ QR บนตั๋ว ระบบจะอ่านและตรวจสอบให้อัตโนมัติ
          </p>
        </div>
        <span className="live-tag">
          <i /> SECURE
        </span>
      </div>
      <div className="card-panel scanner-card">
        <div className={`camera-scanner ${cameraStatus}`}>
          <video
            ref={videoRef}
            className="camera-preview"
            autoPlay
            muted
            playsInline
            aria-label="ภาพจากกล้องสำหรับสแกน QR ตั๋ว"
          />
          <canvas ref={canvasRef} hidden />
          {cameraStatus === "active" ? (
            <>
              <div className="camera-guide" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span className="camera-live">
                <i /> กำลังค้นหา QR Code
              </span>
            </>
          ) : (
            <div className="camera-placeholder">
              <QrCode size={64} />
              <strong>
                {cameraStatus === "starting"
                  ? "กำลังเปิดกล้อง..."
                  : "พร้อมสแกน QR ตั๋ว"}
              </strong>
              <span>วาง QR ให้อยู่ภายในกรอบ กล้องจะสแกนอัตโนมัติ</span>
            </div>
          )}
        </div>
        <div className="camera-actions">
          {cameraStatus === "active" ? (
            <button className="btn outline full" onClick={stopCamera}>
              ปิดกล้อง
            </button>
          ) : (
            <button
              className="btn primary full"
              disabled={cameraStatus === "starting" || checking}
              onClick={() => void startCamera()}
            >
              <QrCode size={17} />
              {cameraStatus === "starting"
                ? "กำลังเปิดกล้อง..."
                : checking
                  ? "กำลังตรวจสอบ..."
                  : result
                    ? "สแกนตั๋วใบถัดไป"
                    : "เปิดกล้องสแกน QR"}
            </button>
          )}
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {result && (
          <div
            className={`scan-result ${result.valid ? "valid" : "invalid"}`}
            aria-live="polite"
          >
            <strong>
              {result.valid ? "✓ ตั๋วถูกต้อง" : "✕ ตั๋วใช้ไม่ได้"}
            </strong>
            <span>สถานะการชำระเงิน: {result.payment_status}</span>
            <span>ที่นั่ง: {result.ticket?.seat_number || "-"}</span>
          </div>
        )}
        <details className="manual-scan">
          <summary>กรอกรหัสตั๋วแทนเมื่อกล้องใช้งานไม่ได้</summary>
          <div className="manual-scan-controls">
            <div className="field">
              <label>QR Code / รหัสตั๋ว</label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="วางข้อความจาก QR Code"
              />
            </div>
            <button
              className="btn outline"
              disabled={!value.trim() || checking}
              onClick={() => {
                stopCamera();
                void check();
              }}
            >
              {checking ? "กำลังตรวจสอบ..." : "ตรวจสอบรหัส"}
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
function OperationsPage() {
  const {
    vans,
    bookings,
    drivers,
    currentUser,
    updateVanStatus,
    updateDepartureTime,
    updateArrivalTime,
    updateCurrentStop,
    boardPassenger,
    alightPassenger,
    alightPassengersAtStop,
    completeTrip,
  } = useVan();
  const [selected, setSelected] = useState<string>("");
  const [incident, setIncident] = useState("");
  const [incidentType, setIncidentType] = useState<"breakdown" | "accident">(
    "breakdown",
  );
  const [scheduleTime, setScheduleTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [currentStop, setCurrentStop] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const isDriver = currentUser?.role === "driver";
  const driverRecord = drivers.find(
    (driver) =>
      driver.phone === currentUser?.profile.phone ||
      driver.name === currentUser?.profile.name,
  );
  const assigned = isDriver
    ? vans.filter((v) => !driverRecord || v.driverId === driverRecord.id)
    : vans;
  const current = assigned.find((v) => v.id === selected) || assigned[0];
  const passengers = bookings.filter(
    (b) => b.vanId === current?.id && b.status !== "Cancelled",
  );
  const routeStops = current
    ? DROP_OFF_POINTS[current.destination] || [current.destination]
    : [];
  const passengersAtStop = (stop: string) =>
    passengers.filter((passenger) =>
      (passenger.dropOffPoint || current?.destination) === stop,
    );
  const runAction = async (name: string, action: () => Promise<void>) => {
    setError("");
    setBusyAction(name);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyAction("");
    }
  };
  const report = async () => {
    if (!current || !incident.trim()) return;
    await runAction("incident", async () => {
      await updateVanStatus(
        current.id,
        "Accident",
        incident.trim(),
        incidentType,
      );
      setIncident("");
    });
  };
  const saveTime = async () => {
    if (!current || !scheduleTime) return;
    await runAction("departure", async () => {
      await updateDepartureTime(
        current.id,
        `${current.date || bangkokDateInput()}T${scheduleTime}:00+07:00`,
      );
      setScheduleTime("");
    });
  };
  const saveArrival = async () => {
    if (!current || !arrivalTime) return;
    await runAction("arrival", async () => {
      await updateArrivalTime(
        current.id,
        `${current.date || bangkokDateInput()}T${arrivalTime}:00+07:00`,
      );
      setArrivalTime("");
    });
  };
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow accent">
            {isDriver ? "DRIVER CONSOLE" : "OPERATIONS"}
          </p>
          <h2>{isDriver ? "ตารางงานและผู้โดยสาร" : "จัดการเที่ยวรถ"}</h2>
          <p className="muted">
            ดูจำนวนผู้โดยสาร ตรวจตั๋ว และอัปเดตสถานะการเดินรถ
          </p>
        </div>
        <span className="live-tag">
          <i /> LIVE
        </span>
      </div>
      <div className="operations-layout">
        <div className="card-panel">
          <div className="section-head compact">
            <h3>เที่ยวรถ</h3>
            <span className="muted">{assigned.length} รายการ</span>
          </div>
          {assigned.map((v) => (
            <button
              className={`operation-row ${current?.id === v.id ? "selected" : ""}`}
              key={v.id}
              onClick={() => {
                setSelected(v.id);
                setScheduleTime("");
                setArrivalTime("");
                setError("");
              }}
            >
              <div className="mini-icon">
                <BusFront size={19} />
              </div>
              <div>
                <strong>กรุงเทพฯ → {v.destination}</strong>
                <small>
                  {thaiDate(v.date)} · {v.departureTime} น. · {v.plateNo}
                </small>
              </div>
              <span className={`status-pill ${statusClass(v.status)}`}>
                {statusText[v.status]}
              </span>
            </button>
          ))}
          {assigned.length === 0 && (
            <EmptyState
              text={
                isDriver
                  ? "ยังไม่มีเที่ยวรถที่มอบหมายให้คุณ"
                  : "ยังไม่มีเที่ยวรถในระบบ"
              }
            />
          )}
        </div>
        <div className="card-panel passenger-panel">
          <div className="section-head compact">
            <div>
              <h3>ผู้โดยสาร</h3>
              <p className="muted">
                {passengers.length} คน · เช็กอินแล้ว{" "}
                {passengers.filter((p) => p.status === "Boarded").length} คน
              </p>
            </div>
          </div>
          {passengers.map((p) => (
            <div className="passenger-row" key={p.id}>
              <div className="avatar small">{p.passengerName.slice(0, 1)}</div>
              <div>
                <strong>{p.passengerName}</strong>
                <small>
                  ที่นั่ง {p.seatNo} · ลงที่ {p.dropOffPoint || "ปลายทาง"} · Booking #{p.id}
                </small>
              </div>
              <span className={`status-pill ${statusClass(p.status)}`}>
                {statusText[p.status]}
              </span>
              {(isDriver ||
                currentUser?.role === "staff" ||
                currentUser?.role === "dispatcher") &&
                p.status === "Paid" && (
                  <button
                    className="btn small primary"
                    disabled={busyAction === `board-${p.id}`}
                    onClick={() =>
                      runAction(`board-${p.id}`, async () => {
                        await boardPassenger(p.id);
                      })
                    }
                  >
                    เช็กอิน
                  </button>
                )}
              {(isDriver ||
                currentUser?.role === "staff" ||
                currentUser?.role === "dispatcher") &&
                p.status === "Boarded" && (
                  <button
                    className="btn small outline"
                    disabled={busyAction === `alight-${p.id}`}
                    onClick={() =>
                      runAction(`alight-${p.id}`, async () => {
                        const released = await alightPassenger(p.id);
                        if (!released) throw new Error("ไม่สามารถปล่อยที่นั่งได้");
                      })
                    }
                  >
                    ลงระหว่างทาง
                  </button>
                )}
            </div>
          ))}
          {!passengers.length && (
            <EmptyState
              text={
                current ? "ยังไม่มีผู้โดยสารในเที่ยวนี้" : "กรุณาเลือกเที่ยวรถ"
              }
            />
          )}
        </div>
      </div>
      {isDriver && current && (
        <div className="card-panel route-dropoff-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow accent">ROUTE DROP-OFFS</p>
              <h3>จุดลงผู้โดยสาร: กรุงเทพฯ → {current.destination}</h3>
              <p className="muted">ตรวจรายชื่อและที่นั่งก่อนถึงแต่ละจุด</p>
            </div>
          </div>
          <div className="route-dropoff-list">
            {routeStops.map((stop, index) => {
              const riders = passengersAtStop(stop);
              const boardedRiders = riders.filter((rider) => rider.status === "Boarded");
              return (
                <div className="route-dropoff-stop" key={stop}>
                  <div className="route-stop-marker">
                    <span>{index + 1}</span>
                    <i />
                  </div>
                  <div>
                    <strong>{stop}</strong>
                    {riders.length ? (
                      <small>
                        {riders.map((rider) => `${rider.passengerName} (ที่นั่ง ${rider.seatNo})`).join(" · ")}
                      </small>
                    ) : (
                      <small>ไม่มีผู้โดยสารลงที่จุดนี้</small>
                    )}
                  </div>
                  <span className="seat-capacity">{riders.length} คน</span>
                  {!!boardedRiders.length && (
                    <button
                      className="btn small primary"
                      disabled={!!busyAction}
                      onClick={() => runAction(`alight-stop-${stop}`, () => alightPassengersAtStop(current.id, stop).then(() => undefined))}
                    >
                      ส่งผู้โดยสาร {boardedRiders.length} คน
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="schedule-control route-location-control">
            <select
              value={currentStop || current.currentStop || routeStops[0] || ""}
              onChange={(event) => setCurrentStop(event.target.value)}
            >
              {routeStops.map((stop) => <option key={stop}>{stop}</option>)}
            </select>
            <button
              className="btn primary"
              disabled={!!busyAction || !routeStops.length}
              onClick={() => runAction("location", () => updateCurrentStop(current.id, currentStop || current.currentStop || routeStops[0]))}
            >
              {busyAction === "location" ? "กำลังอัปเดต..." : "อัปเดตจุดที่รถถึงแล้ว"}
            </button>
          </div>
        </div>
      )}
      {current && (
        <div className="action-bar">
          <div>
            <strong>จัดการเที่ยวรถ: {current.destination}</strong>
            <span className="muted">แจ้งสถานะไปยังผู้โดยสารที่จองตั๋วแล้ว</span>
          </div>
          <div className="action-buttons">
            <button
              className="btn outline"
              disabled={!!busyAction || current.status === "Completed"}
              onClick={() =>
                runAction("travelling", () =>
                  updateVanStatus(current.id, "Travelling"),
                )
              }
            >
              {busyAction === "travelling" ? "กำลังบันทึก..." : "กำลังเดินทาง"}
            </button>
            <button
              className="btn primary"
              disabled={!!busyAction || current.status === "Completed"}
              onClick={() =>
                runAction("departed", () =>
                  updateVanStatus(current.id, "Departed"),
                )
              }
            >
              {busyAction === "departed" ? "กำลังบันทึก..." : "ออกจากสถานีแล้ว"}
            </button>
            <button
              className="btn outline"
              disabled={!!busyAction || current.status === "Completed"}
              onClick={() =>
                runAction("complete", () => completeTrip(current.id))
              }
            >
              {busyAction === "complete" ? "กำลังบันทึก..." : "จบทริป"}
            </button>
          </div>
        </div>
      )}
      {!isDriver && current && (
        <div className="card-panel schedule-editor">
          <h3>ปรับเวลารถเข้า-ออก</h3>
          <div className="schedule-control">
            <input
              aria-label="เวลาออกใหม่"
              type="time"
              value={scheduleTime || current.departureTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
            <button
              className="btn primary"
              onClick={saveTime}
              disabled={!scheduleTime || !!busyAction}
            >
              {busyAction === "departure" ? "กำลังบันทึก..." : "บันทึกเวลาออก"}
            </button>
          </div>
          <div className="schedule-control">
            <input
              aria-label="เวลาถึงใหม่"
              type="time"
              value={arrivalTime || current.arrivalTime || ""}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
            <button
              className="btn outline"
              onClick={saveArrival}
              disabled={!arrivalTime || !!busyAction}
            >
              {busyAction === "arrival" ? "กำลังบันทึก..." : "บันทึกเวลาถึง"}
            </button>
          </div>
        </div>
      )}
      {isDriver && current && (
        <div className="card-panel incident-form">
          <h3>แจ้งเหตุขัดข้องหรืออุบัติเหตุ</h3>
          <div className="field">
            <label htmlFor="incident-type">ประเภทเหตุการณ์</label>
            <select
              id="incident-type"
              value={incidentType}
              onChange={(event) =>
                setIncidentType(
                  event.target.value as "breakdown" | "accident",
                )
              }
            >
              <option value="breakdown">รถขัดข้อง</option>
              <option value="accident">อุบัติเหตุ</option>
            </select>
          </div>
          <div className="field">
            <label>รายละเอียดเหตุการณ์</label>
            <textarea
              value={incident}
              onChange={(e) => setIncident(e.target.value)}
              placeholder="เช่น รถขัดข้องหรือเกิดอุบัติเหตุบริเวณ..."
            />
          </div>
          <button
            className="btn danger-outline"
            onClick={report}
            disabled={!incident.trim() || !!busyAction}
          >
            {busyAction === "incident"
              ? "กำลังแจ้งเหตุ..."
              : "แจ้งเหตุให้เจ้าหน้าที่ทราบ"}
          </button>
          {error && <div className="alert error">{error}</div>}
        </div>
      )}
      {error && !isDriver && <div className="alert error">{error}</div>}
    </div>
  );
}
