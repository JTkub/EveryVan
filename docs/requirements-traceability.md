# EveryVan — Requirement Traceability

เอกสารนี้อ้างอิง Requirement, FR-01–FR-40 และ NFR-01–NFR-25 ที่ได้รับจากผู้ใช้  
สถานะ `ครบ` หมายถึงมี flow ทั้งหน้าเว็บและ API/ฐานข้อมูล หรือมี fallback จำลองที่ระบุชัดเจน

## Functional requirements

| Requirement | หลักฐานการทำงาน | สถานะ |
|---|---|---|
| FR-01–02 เลือกปลายทาง วันที่ และรอบเวลา | หน้า `BookingPage` กรองเที่ยวรถตามปลายทาง/วันที่/รอบ | ครบ |
| FR-03–05 ผังที่นั่ง เลือก และยืนยันจอง | ผังที่นั่งตามความจุรถ, สถานะว่าง/ไม่ว่าง/เลือก, `POST /api/bookings` | ครบ |
| FR-06–08 e-ticket บนมือถือ | `TicketsPageV2`, QR, responsive CSS และ `GET /api/tickets` | ครบ |
| FR-09–10 ตรวจชำระจาก QR/แสดงสถานะ | `ScannerPage`, `POST /api/scan`, สถานะและใบเสร็จบนตั๋ว | ครบ |
| FR-11 ข้อมูลรถ ทะเบียน ปลายทาง | Trip card และ e-ticket แสดงข้อมูลจาก trip/vehicle/route | ครบ |
| FR-12–13 ข้อมูลและรูปคนขับ | ตาราง `driver`, `GET /api/drivers`, หน้าเที่ยวรถ/ตั๋ว | ครบ |
| FR-14 แก้เวลาเข้า–ออก | `OperationsPage`, `PATCH /api/trips/:id/time` | ครบ |
| FR-15–16 ที่นั่งว่างและสถานะรถ | คำนวณจาก booking ที่ active และ `trip_status` | ครบ |
| FR-17–18 แจ้งใกล้ออก/เวลาเปลี่ยน | ตาราง `notification`, maintenance ทุก 30 วินาที, แจ้งเมื่อแก้เวลา | ครบ |
| FR-19 เข้าสู่ระบบ | password hash, session ที่มีอายุ, `require()` และ RBAC | ครบ |
| FR-20–26 ข้อมูลและแก้โปรไฟล์ | สมัคร/โปรไฟล์ ชื่อ วันเกิด โทร อีเมล เลขบัตร, `PUT /api/auth/profile` | ครบ |
| FR-27–30 รายการ ยอด ใบเสร็จ รายงานรายวัน | Finance/Reports, mock payment, receipt number, `/api/reports/daily` | ครบ |
| FR-31 ยกเลิกอัตโนมัติ 5 นาที | `expires_at`, backend cleanup และ frontend demo cleanup | ครบ |
| FR-32 รายการล้มเหลว/ยกเลิก | รายงานรวมสถานะ Pending/Cancelled/Success | ครบ |
| FR-33–35 จำนวนผู้โดยสาร/สรุป/ตารางคนขับ | Driver overview และ Operations กรองตามคนขับ | ครบ |
| FR-36–37 สแกนและตรวจ QR/เที่ยว/ที่นั่ง | คนขับสแกนจากกล้องสด, server จำกัดสิทธิ์เฉพาะคนขับและตรวจเที่ยว สถานะชำระ trip/seat | ครบ |
| FR-38 ยืนยันส่งเสร็จ | `POST /api/trips/:id/complete` และปุ่มจบทริป | ครบ |
| FR-39–40 เหตุขัดข้อง/อุบัติเหตุ | เลือกประเภทเหตุ, รายละเอียด, audit และ notification | ครบ |

## ข้อกำหนดเพิ่มเติมสำหรับผู้ดูแลระบบ

| Requirement | หลักฐานการทำงาน | สถานะ |
|---|---|---|
| Admin จัดการบัญชีพนักงาน | หน้า `AdminAccountsPage`, `POST /api/admin/employees`, `PATCH /api/admin/users/:id` รองรับสร้าง แก้บทบาท รีเซ็ตรหัส และเปิด/ปิดบัญชี | ครบ |
| Admin จัดการบัญชีลูกค้า | `GET /api/admin/users` และ `PATCH /api/admin/users/:id` แสดงและแก้ข้อมูลลูกค้า รีเซ็ตรหัส และเปิด/ปิดบัญชี โดยล็อกประเภทบัญชีเป็นลูกค้า | ครบ |
| จำกัดสิทธิ์เฉพาะ Admin | API ทุกเส้นทางใช้ `@require("admin")`; บัญชีที่ปิดใช้งานจะล็อกอินไม่ได้และ session เดิมถูกยกเลิก | ครบ |
| ทุกบทบาทเปลี่ยนรหัสผ่านตนเอง | หน้า `ProfilePage` และ `PUT /api/auth/password` ตรวจรหัสเดิม บังคับรหัสใหม่อย่างน้อย 8 ตัว และยกเลิก session อุปกรณ์อื่น | ครบ |

## Non-functional requirements

| Requirement | วิธีรองรับ/หลักฐาน | สถานะ |
|---|---|---|
| NFR-01, 21 ใช้ง่ายและภาษาไทย | เมนูตามบทบาท, ข้อความ/validation ภาษาไทย | ครบ |
| NFR-02, 22 มือถือ/แท็บเล็ต | responsive layout, mobile sidebar, touch-size controls | ครบ |
| NFR-03, 25 ความถูกต้องของข้อมูล | frontend ใช้ ID อ้างอิง booking/trip/driver; API join จาก PostgreSQL | ครบ |
| NFR-04–06 ยืนยันตัวตน/แยกข้อมูล/RBAC | bearer session, ownership checks, route role decorators | ครบ |
| NFR-07–08 ความปลอดภัยข้อมูล | PBKDF2, hash session token, ไม่ log ค่าโปรไฟล์, mock payment ไม่มีข้อมูลบัตร | ครบ |
| NFR-09 การตอบสนอง | query indexes, โหลดข้อมูลขนาน, production build | รองรับ |
| NFR-10, 14 หลายผู้ใช้/เสถียร | transaction + DB constraints; ต้องทำ load test ในสภาพแวดล้อม deploy จริง | รองรับ |
| NFR-11, 23 ที่นั่งทันเวลา/ไม่ซ้ำ | unique partial index `uq_active_trip_seat`, transaction และ refresh 30 วินาที | ครบ |
| NFR-12 แจ้งเปลี่ยนเวลาเร็ว | สร้าง notification ใน transaction เดียวกับแก้เวลา | ครบ |
| NFR-13 QR ถูกต้อง/เร็ว | token สุ่ม, lookup แบบ unique, สแกนอัตโนมัติจากกล้องสด | ครบ |
| NFR-15–16 สำรอง/กู้คืน | `api/backup.ps1`, `api/restore.ps1` ใช้ `DATABASE_URL` | ครบ |
| NFR-17 audit log | booking/payment/cancel/trip/profile/review/incident | ครบ |
| NFR-18 ยอด/รายงานถูกต้อง | amount มาจาก fare ฝั่ง server; aggregate PostgreSQL | ครบ |
| NFR-19 error เข้าใจง่าย | error ภาษาไทย, alert ในแต่ละ flow, แถบโหมดจำลอง | ครบ |
| NFR-20 ดูแลต่อได้ | domain types/date/security แยก module, test และเอกสารนี้ | ครบ |
| NFR-24 เน็ตทั่วไป/ทรัพยากร | Vite production bundle, polling 30 วินาที, ไม่มีภาพ QR จาก URL ซ้ำ | รองรับ |

## การตรวจอัตโนมัติ

รัน `npm run check` เพื่อตรวจ lint, frontend unit tests, production build และ backend tests  
NFR-10/NFR-14 ต้องวัด concurrent load เพิ่มในเครื่อง staging ที่มี PostgreSQL จริงก่อนนำขึ้น production
