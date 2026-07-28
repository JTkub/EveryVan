import assert from "node:assert/strict";

assert.ok(
  process.env.API_BASE_URL,
  "กำหนด API_BASE_URL ให้ชี้ไปยัง API/ฐานข้อมูลทดสอบก่อนรัน smoke test",
);
const base = process.env.API_BASE_URL.replace(/\/$/, "");
const suffix = `${Date.now()}`;

async function call(
  path,
  { method = "GET", token, body, expected = [200] } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : new Uint8Array(await response.arrayBuffer());
  assert.ok(
    expected.includes(response.status),
    `${method} ${path}: expected ${expected.join("/")}, got ${response.status} ${JSON.stringify(data)}`,
  );
  return { response, data };
}

async function login(username, password = username) {
  const { data } = await call("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  assert.ok(data.token);
  return data;
}

const completed = [];
function passed(name) {
  completed.push(name);
  console.log(`✓ ${name}`);
}

await call("/health");
passed("health และ PostgreSQL");

const { data: publicTrips } = await call("/trips");
const { data: publicRoutes } = await call("/routes");
const { data: publicDrivers } = await call("/drivers");
assert.ok(publicTrips.vans.length >= 1);
assert.ok(publicRoutes.routes.length >= 1);
assert.ok(publicDrivers.drivers.length >= 1);
passed("ข้อมูลเที่ยวรถ เส้นทาง และคนขับ");

const staff = await login("staff");
const driver = await login("driver");
const accountant = await login("accountant");
const admin = await login("admin");
let seededPassenger = await login("pax");
for (const session of [staff, driver, accountant, admin]) {
  const { data } = await call("/auth/session", { token: session.token });
  assert.equal(data.user.role, session.user.role);
}
passed("เข้าสู่ระบบ/session และสิทธิ์ทุกบทบาท");

const { data: managedUsers } = await call("/admin/users", {
  token: admin.token,
});
assert.ok(managedUsers.users.some((user) => user.role === "passenger"));
await call("/admin/users", {
  token: seededPassenger.token,
  expected: [403],
});
const managedUsername = `employee${suffix}`;
const { data: managedEmployee } = await call("/admin/employees", {
  method: "POST",
  token: admin.token,
  expected: [201],
  body: {
    username: managedUsername,
    password: "EmployeePass123!",
    name: "พนักงาน ทดสอบระบบ",
    email: `${managedUsername}@example.com`,
    phone: "0892222222",
    dob: "1990-01-01",
    role: "staff",
    department: "ฝ่ายทดสอบ",
    employeeId: `EMP-${suffix}`,
  },
});
const managedSession = await login(managedUsername, "EmployeePass123!");
await call(`/admin/users/${managedEmployee.user.id}`, {
  method: "PATCH",
  token: admin.token,
  body: {
    role: "accountant",
    department: "ฝ่ายบัญชี",
    employeeId: `EMP-${suffix}`,
    password: "EmployeeChanged123!",
  },
});
await call(`/admin/users/${managedEmployee.user.id}`, {
  method: "PATCH",
  token: admin.token,
  body: { isActive: false },
});
await call("/auth/session", {
  token: managedSession.token,
  expected: [401],
});
await call("/auth/login", {
  method: "POST",
  body: { username: managedUsername, password: "EmployeeChanged123!" },
  expected: [403],
});
await call(`/admin/users/${managedEmployee.user.id}`, {
  method: "PATCH",
  token: admin.token,
  body: { isActive: true },
});
const managedChangedSession = await login(
  managedUsername,
  "EmployeeChanged123!",
);
await call("/auth/password", {
  method: "PUT",
  token: managedChangedSession.token,
  body: {
    currentPassword: "EmployeeChanged123!",
    newPassword: "OwnPassword123!",
  },
});
await call("/auth/session", { token: managedChangedSession.token });
await call("/auth/login", {
  method: "POST",
  body: { username: managedUsername, password: "EmployeeChanged123!" },
  expected: [401],
});
await login(managedUsername, "OwnPassword123!");
const editableCustomer = managedUsers.users.find(
  (user) => user.role === "passenger",
);
const { data: updatedCustomer } = await call(
  `/admin/users/${editableCustomer.id}`,
  {
    method: "PATCH",
    token: admin.token,
    body: {
      name: "ลูกค้า แก้ไขโดยแอดมิน",
      phone: "0893333333",
      thaiId: `8${suffix.slice(-12)}`,
      password: "CustomerReset123!",
    },
  },
);
assert.equal(updatedCustomer.user.name, "ลูกค้า แก้ไขโดยแอดมิน");
assert.equal(updatedCustomer.user.thaiId, `8${suffix.slice(-12)}`);
seededPassenger = await login(
  editableCustomer.username,
  "CustomerReset123!",
);
await call(`/admin/users/${editableCustomer.id}`, {
  method: "PATCH",
  token: admin.token,
  body: { role: "staff" },
  expected: [400],
});
passed("แอดมินจัดการบัญชีพนักงาน/ลูกค้า และทุกบทบาทเปลี่ยนรหัสตนเอง");

const username = `smoke${suffix}`;
const email = `${username}@example.com`;
await call("/auth/register", {
  method: "POST",
  expected: [201],
  body: {
    username,
    password: "SmokePass123!",
    name: "ผู้โดยสาร ทดสอบ",
    email,
    phone: "0890000000",
    dob: "1998-04-12",
    thaiId: `9${suffix.slice(-12)}`,
  },
});
const passenger = await login(username, "SmokePass123!");
await call("/auth/profile", {
  method: "PUT",
  token: passenger.token,
  body: {
    name: "ผู้โดยสาร ทดสอบระบบ",
    email,
    phone: "0891111111",
    dob: "1998-04-12",
    thaiId: `9${suffix.slice(-12)}`,
  },
});
passed("สมัครสมาชิกและแก้โปรไฟล์");

const departure = new Date(Date.now() + 24 * 60 * 60 * 1000);
const arrival = new Date(departure.getTime() + 2 * 60 * 60 * 1000);
const driverId = Number(publicDrivers.drivers[0].driver_id);
const { data: createdTrip } = await call("/trips", {
  method: "POST",
  token: staff.token,
  expected: [201],
  body: {
    destination: `ปลายทางทดสอบ-${suffix}`,
    departure_time: departure.toISOString(),
    license_plate: `T-${suffix.slice(-8)}`,
    vehicle_type: "Toyota Commuter",
    total_seats: 12,
    driver_id: driverId,
    price: 245,
  },
});
const tripId = Number(createdTrip.trip.trip_id);
const { data: seatMap } = await call(`/trips/${tripId}/seats`);
assert.equal(seatMap.total, 12);
passed("เพิ่มเที่ยวรถและสร้างผังที่นั่ง");

const { data: bookingResult } = await call("/bookings", {
  method: "POST",
  token: passenger.token,
  expected: [201],
  body: { trip_id: tripId, seat_number: 1, boarding_point: "จุดทดสอบ" },
});
const bookingId = Number(bookingResult.booking.booking_id);
const pax = seededPassenger;
await call("/bookings", {
  method: "POST",
  token: pax.token,
  expected: [409],
  body: { trip_id: tripId, seat_number: 1 },
});
passed("จองที่นั่งจริงและป้องกันการจองที่นั่งซ้ำ");

const { data: paymentResult } = await call(`/bookings/${bookingId}/pay`, {
  method: "POST",
  token: passenger.token,
});
assert.ok(paymentResult.receipt_no);
const { data: ticketList } = await call("/tickets", {
  token: passenger.token,
});
const ticket = ticketList.tickets.find(
  (item) => Number(item.booking_id) === bookingId,
);
assert.ok(ticket?.qr_code);
const qr = await call(`/tickets/${ticket.ticket_id}/qr`, {
  token: passenger.token,
});
assert.equal(qr.response.headers.get("content-type"), "image/png");
assert.ok(qr.data.byteLength > 100);
passed("mock payment, ใบเสร็จ, e-ticket และรูป QR");

await call("/scan", {
  method: "POST",
  token: passenger.token,
  expected: [403],
  body: { qr_code: ticket.qr_code },
});
const { data: scanResult } = await call("/scan", {
  method: "POST",
  token: driver.token,
  body: { qr_code: ticket.qr_code },
});
assert.equal(scanResult.valid, true);
await call("/scan", {
  method: "POST",
  token: staff.token,
  expected: [403],
  body: { qr_code: ticket.qr_code },
});
await call(`/bookings/${bookingId}/board`, {
  method: "POST",
  token: staff.token,
});
passed("สแกน QR, ตรวจสิทธิ์ และเช็กอินขึ้นรถ");

await call(`/trips/${tripId}/time`, {
  method: "PATCH",
  token: staff.token,
  body: {
    departure_time: departure.toISOString(),
    arrive_time: arrival.toISOString(),
  },
});
await call(`/trips/${tripId}/status`, {
  method: "PATCH",
  token: driver.token,
  body: { status: "departed" },
});
await call(`/trips/${tripId}/incident`, {
  method: "POST",
  token: driver.token,
  expected: [201],
  body: { incident_type: "breakdown", detail: "ทดสอบระบบแจ้งเหตุ" },
});
await call(`/trips/${tripId}/complete`, {
  method: "POST",
  token: driver.token,
});
passed("แก้เวลา, เปลี่ยนสถานะ, แจ้งเหตุ และปิดเที่ยวรถ");

await call("/bookings", {
  method: "POST",
  token: pax.token,
  expected: [409],
  body: { trip_id: tripId, seat_number: 2 },
});
await call(`/drivers/${driverId}/reviews`, {
  method: "POST",
  token: passenger.token,
  expected: [201],
  body: {
    booking_id: bookingId,
    rating: 5,
    comment: "ทดสอบรีวิวหลังจบทริป",
  },
});
passed("ปิดรับจองเที่ยวที่จบแล้วและรีวิวคนขับ");

const cancellableTrip = publicTrips.vans.find(
  (item) => Number(item.id) !== tripId,
);
assert.ok(cancellableTrip);
const { data: cancelBooking } = await call("/bookings", {
  method: "POST",
  token: passenger.token,
  expected: [201],
  body: {
    trip_id: Number(cancellableTrip.id),
    seat_number: Math.max(
      1,
      ...Array.from(
        { length: Number(cancellableTrip.capacity) },
        (_, index) => index + 1,
      ).filter((seat) => !cancellableTrip.occupiedSeats.includes(seat)),
    ),
  },
});
await call(`/bookings/${cancelBooking.booking.booking_id}/cancel`, {
  method: "POST",
  token: passenger.token,
});
passed("ยกเลิกการจองและคืนสถานะรายการ");

const { data: notifications } = await call("/notifications", {
  token: passenger.token,
});
assert.ok(notifications.notifications.length >= 1);
await call("/notifications/read", {
  method: "POST",
  token: passenger.token,
});
passed("การแจ้งเตือนและทำเครื่องหมายว่าอ่านแล้ว");

const { data: report } = await call("/reports/daily", {
  token: accountant.token,
});
assert.ok(Number(report.summary.count) >= 1);
assert.ok(
  report.transactions.some((item) => Number(item.booking_id) === bookingId),
);
passed("รายงานรายวันและรายการธุรกรรม");

await call("/trips", {
  method: "POST",
  token: passenger.token,
  expected: [403],
  body: {},
});
await call("/reports/daily", {
  token: passenger.token,
  expected: [403],
});
passed("RBAC ป้องกันคำสั่งข้ามบทบาท");

for (const session of [passenger, pax, staff, driver, accountant, admin]) {
  await call("/auth/logout", { method: "POST", token: session.token });
}
passed("ออกจากระบบ");

console.log(
  `\nEveryVan smoke test ผ่าน ${completed.length} กลุ่มฟังก์ชันที่ ${base}`,
);
