# ดัชนีโค้ดและ API ของ EveryVan

ใช้เอกสารนี้ค้นจุดเริ่มอ่านอย่างรวดเร็ว แล้วอ่านคำอธิบาย flow ใน [คู่มือหลัก](README.md) ตำแหน่งบรรทัดตรวจจาก source code วันที่ **15 ตุลาคม 2026** หากโค้ดเลื่อนให้ค้นชื่อฟังก์ชันประกอบ

## ฟังก์ชันหน้าจอใน App.tsx

ฟังก์ชันเหล่านี้อยู่ในไฟล์เดียว ชื่อ Page เป็นชื่อ component ไม่ใช่ชื่อไฟล์แยก

| ฟังก์ชัน | หน้าที่ |
|---|---|
| [Brand](../../src/App.tsx#L89) | โลโก้และชื่อระบบ |
| [Sidebar](../../src/App.tsx#L102) | รายการเมนูตามบทบาทและเปลี่ยนหน้า |
| [Topbar](../../src/App.tsx#L266) | หัวหน้าเว็บ ผู้ใช้และแจ้งเตือน |
| [Stat](../../src/App.tsx#L348) | กล่องตัวเลขสรุปที่ใช้ซ้ำ |
| [TripCard](../../src/App.tsx#L375) | บัตรเที่ยวรถและปุ่มเลือกเที่ยว |
| [PassengerOverview](../../src/App.tsx#L440) | ภาพรวมผู้โดยสารและเที่ยวรถ |
| [BookingPage](../../src/App.tsx#L534) | ค้นเที่ยว เลือกที่นั่ง ยืนยัน และชำระ Demo |
| [DriverOverview](../../src/App.tsx#L937) | ภาพรวมเที่ยวของคนขับ |
| [FinanceOverview](../../src/App.tsx#L1037) | ภาพรวมการเงิน |
| [AdminOverview](../../src/App.tsx#L1149) | ภาพรวมผู้ดูแล |
| [AdminAccountsPage](../../src/App.tsx#L1288) | จัดการบัญชี เรียก api.admin โดยตรง |
| [QueueOverview](../../src/App.tsx#L1783) | ภาพรวมคิวรถ |
| [ReportsPage](../../src/App.tsx#L1859) | สรุปธุรกรรมจาก Context |
| [FollowersPage](../../src/App.tsx#L1953) | คำขอติดตามและข้อมูลการเดินทาง |
| [ProfilePage](../../src/App.tsx#L1986) | แก้ข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน |
| [EmptyState](../../src/App.tsx#L2221) | ข้อความเมื่อไม่มีข้อมูล |
| [Dashboard](../../src/App.tsx#L2230) | เลือก AuthView หรือ DashboardContent ตาม currentUser |
| [DashboardContent](../../src/App.tsx#L2234) | เลือก content ด้วย active และ role ประกอบ Sidebar กับ Topbar |
| [App](../../src/App.tsx#L2342) | ครอบ Dashboard ด้วย VanProvider |
| [TicketsPageV2](../../src/App.tsx#L2350) | ตั๋ว QR ยกเลิกและรีวิว |
| [CreateTripPage](../../src/App.tsx#L2567) | เพิ่มเที่ยวรถ และแสดง RecurringSchedules |
| [ScannerPage](../../src/App.tsx#L2726) | กล้อง อ่าน QR และส่งคำขอสแกน |
| [OperationsPage](../../src/App.tsx#L2988) | จัดการเวลา สถานะ จุดล่าสุด และผู้โดยสาร |

## Actions และจุดอ่านใน VanContext

ทุกชื่อในตารางนี้อยู่ใน [VanContext.tsx](../../src/context/VanContext.tsx) ค่ากับ actions ที่เปิดให้ลูกใช้ดูได้ใน interface VanContextType และ value ของ VanContext.Provider

| ชื่อ | หน้าที่ |
|---|---|
| [refreshDatabase](../../src/context/VanContext.tsx#L157) | โหลด API มาใส่ shared state ใหม่ ไม่ได้ล้างฐานข้อมูล |
| [login](../../src/context/VanContext.tsx) | ตรวจชื่อผู้ใช้/รหัสผ่านผ่าน API แล้วตั้ง pendingOtpUser เพื่อรอ OTP |
| [verifyOtp / cancelOtp](../../src/context/VanContext.tsx) | รับตัวเลขครบ 6 หลักเพื่อเปิดหน้าทำงาน หรือออกจาก pending session เมื่อย้อนกลับ |
| [logout](../../src/context/VanContext.tsx#L250) | ออกจากระบบและเคลียร์ state |
| [registerUser](../../src/context/VanContext.tsx#L261) | สมัครบัญชีผู้โดยสารผ่าน API |
| [updateUserProfile](../../src/context/VanContext.tsx#L274) | แก้โปรไฟล์และอัปเดต currentUser |
| [changeOwnPassword](../../src/context/VanContext.tsx#L284) | เปลี่ยนรหัสผ่านของผู้ใช้ปัจจุบัน |
| [bookTicket](../../src/context/VanContext.tsx#L293) | สร้าง booking และโหลดข้อมูลใหม่ |
| [confirmPayment](../../src/context/VanContext.tsx#L313) | เรียก Demo payment แล้ว refresh |
| [cancelBooking](../../src/context/VanContext.tsx#L325) | ยกเลิก booking และ refresh |
| [updateVanStatus](../../src/context/VanContext.tsx#L331) | เปลี่ยนสถานะหรือส่งรายงานเหตุขัดข้อง |
| [updateDepartureTime](../../src/context/VanContext.tsx#L361) | ปรับเวลาออกของเที่ยว |
| [updateArrivalTime](../../src/context/VanContext.tsx#L374) | ปรับเวลาถึงของเที่ยว |
| [updateCurrentStop](../../src/context/VanContext.tsx#L384) | ปรับจุดล่าสุดของรถ |
| [createVanSchedule](../../src/context/VanContext.tsx#L390) | สร้างเที่ยวและแปลงวันที่เป็นเวลาไทย |
| [addReview](../../src/context/VanContext.tsx#L418) | ส่งรีวิวคนขับที่อ้างอิง booking |
| [boardPassenger](../../src/context/VanContext.tsx#L435) | เช็กอินผ่านรายการผู้โดยสาร |
| [alightPassenger](../../src/context/VanContext.tsx#L453) | ยืนยันลงรถรายคน |
| [alightPassengersAtStop](../../src/context/VanContext.tsx#L471) | ยืนยันลงรถตามจุด |
| [completeTrip](../../src/context/VanContext.tsx#L478) | ปิดเที่ยวรถ |
| [addNotification](../../src/context/VanContext.tsx#L219) | เพิ่มแจ้งเตือนใน React state |
| [markNotificationsAsRead](../../src/context/VanContext.tsx#L236) | เปลี่ยนสถานะอ่านใน UI และแจ้ง API |

## กลุ่มใน api.ts

อ่าน [request](../../src/services/api.ts#L64) ก่อน แล้วตามเข้าแต่ละกลุ่ม `request` เติม BASE, JSON header และ Bearer token ให้คำขอ

| กลุ่ม | ใช้กับ |
|---|---|
| [api.recurring](../../src/services/api.ts#L159) | แม่แบบคิวประจำ |
| [api.auth](../../src/services/api.ts#L165) | สมัคร เข้าสู่ระบบ session โปรไฟล์ รหัสผ่าน |
| [api.admin](../../src/services/api.ts#L233) | บัญชีพนักงานและลูกค้า |
| [api.vans](../../src/services/api.ts#L250) | เที่ยวรถ เวลา สถานะ จุดล่าสุดและเหตุขัดข้อง |
| [api.bookings](../../src/services/api.ts#L291) | สร้าง จ่าย ยกเลิก ขึ้นรถ ลงรถ |
| [api.drivers](../../src/services/api.ts#L339) | คนขับและรีวิว |
| [api.scanner](../../src/services/api.ts#L348) | สแกน QR และเช็กอิน |
| [api.notifications](../../src/services/api.ts#L360) | รายการแจ้งเตือนและอ่านแล้ว |
| [api.followers](../../src/services/api.ts#L366) | ผู้ติดตามและการตอบรับคำขอ |
| [api.transactions](../../src/services/api.ts#L376) | อ่านธุรกรรมจาก reports/daily |

## Endpoint ใน Flask

ตารางนี้ดึง path, method, function และบทบาทจาก decorators ใน app.py ไม่ใช่ข้อสรุปว่าบทบาทนั้นเข้าถึงข้อมูลทุกรายการได้ ต้องอ่าน can_access_booking, can_access_ticket, can_manage_trip และเงื่อนไขภายในฟังก์ชันเพิ่ม

“ล็อกอินทุกบทบาท” หมายถึง @require() โดยไม่ระบุ role ส่วน “ไม่กำหนด @require” หมายถึงไม่มี decorator นี้บน endpoint นั้น ไม่ได้ยกเลิก before_request หรือการตรวจอื่นของระบบ

| Method | Path | ฟังก์ชัน | บทบาทจาก @require |
|---|---|---|---|
| GET | `/api/health` | [health](../../api/app.py#L354) | ไม่กำหนด @require |
| GET | `/api/followers` | [followers](../../api/app.py#L360) | ล็อกอินทุกบทบาท |
| POST | `/api/followers` | [add_follower](../../api/app.py#L383) | passenger |
| PATCH | `/api/followers/<int:follower_id>` | [respond_follower](../../api/app.py#L412) | ล็อกอินทุกบทบาท |
| DELETE | `/api/followers/<int:follower_id>` | [remove_follower](../../api/app.py#L431) | passenger |
| POST | `/api/auth/register` | [register](../../api/app.py#L446) | ไม่กำหนด @require |
| POST | `/api/auth/login` | [login](../../api/app.py#L487) | ไม่กำหนด @require |
| GET | `/api/auth/session` | [session](../../api/app.py#L512) | ล็อกอินทุกบทบาท |
| POST | `/api/auth/logout` | [logout](../../api/app.py#L518) | ล็อกอินทุกบทบาท |
| PUT | `/api/auth/profile` | [profile](../../api/app.py#L530) | ล็อกอินทุกบทบาท |
| PUT | `/api/auth/password` | [change_password](../../api/app.py#L570) | ล็อกอินทุกบทบาท |
| GET | `/api/admin/users` | [admin_users](../../api/app.py#L602) | admin |
| POST | `/api/admin/employees` | [create_employee](../../api/app.py#L635) | admin |
| PATCH | `/api/admin/users/<int:user_id>` | [update_managed_user](../../api/app.py#L703) | admin |
| GET | `/api/notifications` | [notifications](../../api/app.py#L832) | ล็อกอินทุกบทบาท |
| POST | `/api/notifications/read` | [read_notifications](../../api/app.py#L843) | ล็อกอินทุกบทบาท |
| GET | `/api/routes` | [routes](../../api/app.py#L851) | ไม่กำหนด @require |
| GET | `/api/drivers` | [drivers](../../api/app.py#L858) | ไม่กำหนด @require |
| POST | `/api/drivers/<int:driver_id>/reviews` | [create_driver_review](../../api/app.py#L866) | passenger |
| GET | `/api/trips` | [trips](../../api/app.py#L909) | ไม่กำหนด @require |
| GET | `/api/trips/<int:trip_id>/seats` | [seats](../../api/app.py#L956) | ไม่กำหนด @require |
| POST | `/api/trips` | [create_trip](../../api/app.py#L970) | staff, dispatcher, admin |
| GET | `/api/recurring-schedules` | [recurring_schedules](../../api/app.py#L1064) | staff, dispatcher, admin |
| POST | `/api/recurring-schedules` | [save_recurring_schedule](../../api/app.py#L1081) | staff, dispatcher, admin |
| PUT | `/api/recurring-schedules/<int:recurring_id>` | [save_recurring_schedule](../../api/app.py#L1081) | staff, dispatcher, admin |
| GET | `/api/bookings` | [bookings](../../api/app.py#L1129) | ล็อกอินทุกบทบาท |
| POST | `/api/bookings` | [create_booking](../../api/app.py#L1152) | passenger |
| POST | `/api/bookings/<int:booking_id>/pay` | [pay](../../api/app.py#L1232) | passenger |
| POST | `/api/bookings/<int:booking_id>/cancel` | [cancel](../../api/app.py#L1260) | passenger, staff, dispatcher, admin |
| POST | `/api/bookings/<int:booking_id>/board` | [board](../../api/app.py#L1282) | driver, staff, dispatcher, admin |
| POST | `/api/bookings/<int:booking_id>/alight` | [alight](../../api/app.py#L1309) | driver, staff, dispatcher, admin |
| POST | `/api/trips/<int:trip_id>/alight-stop` | [alight_stop](../../api/app.py#L1336) | driver, staff, dispatcher, admin |
| GET | `/api/tickets` | [tickets](../../api/app.py#L1360) | ล็อกอินทุกบทบาท |
| GET | `/api/tickets/<int:ticket_id>/qr` | [ticket_qr](../../api/app.py#L1379) | ล็อกอินทุกบทบาท |
| POST | `/api/scan` | [scan](../../api/app.py#L1399) | driver |
| PATCH | `/api/trips/<int:trip_id>/location` | [trip_location](../../api/app.py#L1445) | driver, staff, dispatcher, admin |
| PATCH | `/api/trips/<int:trip_id>/status` | [trip_status](../../api/app.py#L1466) | driver, staff, dispatcher, admin |
| PATCH | `/api/trips/<int:trip_id>/time` | [trip_time](../../api/app.py#L1488) | staff, dispatcher, admin |
| POST | `/api/trips/<int:trip_id>/incident` | [trip_incident](../../api/app.py#L1510) | driver, staff, dispatcher, admin |
| POST | `/api/trips/<int:trip_id>/complete` | [complete_trip](../../api/app.py#L1539) | driver, staff, dispatcher, admin |
| GET | `/api/reports/daily` | [report](../../api/app.py#L1570) | accountant, staff, dispatcher, admin |
| GET | `/` | [index](../../api/app.py#L1583) | ไม่กำหนด @require |

รวม 42 คู่ method และ path ที่ประกาศด้วย app.get/post/put/patch/delete ใน source ปัจจุบัน `<int:...>` คือ path parameter แบบจำนวนเต็มใน Flask; ในคู่มือย่อเป็น `:id` เพื่อให้อ่านง่าย

## Helper หลังบ้านที่ควรอ่าน

| ฟังก์ชัน | ใช้ทำอะไร |
|---|---|
| [db](../../api/app.py#L51) | เปิดการเชื่อมต่อ PostgreSQL ใน Flask context และตั้ง timezone |
| [uid](../../api/app.py#L97) | ตรวจ session hash วันหมดอายุ และบัญชียัง active |
| [current_user](../../api/app.py#L110) | โหลดบัญชีของ session ที่ตรวจแล้ว |
| [require](../../api/app.py#L118) | decorator ตรวจล็อกอินและบทบาท |
| [can_access_ticket](../../api/app.py#L158) | สิทธิ์เข้าถึงตั๋ว |
| [can_access_booking](../../api/app.py#L180) | สิทธิ์เข้าถึง booking |
| [can_manage_trip](../../api/app.py#L196) | สิทธิ์จัดการเที่ยวรถ |
| [public_user](../../api/app.py#L209) | จัดรูปข้อมูลผู้ใช้ก่อนตอบหน้าบ้าน |
| [audit](../../api/app.py#L134) | บันทึกประวัติการทำรายการ |
| [notify_trip](../../api/app.py#L142) | แจ้งเตือนผู้โดยสารของเที่ยว |
| [notify_followers](../../api/app.py#L150) | แจ้งเตือนผู้ติดตามการเดินทาง |
| [initialize_schema](../../api/app.py#L286) | เริ่มต้นหรือปรับ schema จาก ticket_schema.sql |
| [cleanup_expired](../../api/app.py#L299) | ยกเลิกการจองค้างและปล่อยที่นั่งตามเวลา |
| [create_departure_notifications](../../api/app.py#L321) | สร้างแจ้งเตือนใกล้ออกเดินทาง |
| [before](../../api/app.py#L330) | maintenance ก่อนรับคำขอ /api พร้อมกำหนดช่วงเว้นภายใน process |

## โค้ดคิวประจำ รหัสผ่าน และชนิดข้อมูล

| จุดอ่าน | หน้าที่ |
|---|---|
| [normalize_template](../../api/recurring.py#L10) | ตรวจและแปลงค่าข้อมูลแม่แบบ |
| [lock_generation](../../api/recurring.py#L48) | ใช้ PostgreSQL advisory lock ร่วมกัน |
| [generate_daily_trips](../../api/recurring.py#L53) | สร้างหรือปรับเที่ยวตามแม่แบบในช่วงวัน |
| [hash_password](../../api/security.py#L11) | PBKDF2 พร้อม salt |
| [check_password](../../api/security.py#L19) | ตรวจรหัสผ่านและรองรับ hash เดิม |
| [new_session_token](../../api/security.py#L33) | สุ่ม token |
| [hash_token](../../api/security.py#L37) | hash token ก่อนเก็บหรือเทียบ |
| [run_once](../../api/maintenance.py#L8) | งาน scheduler หนึ่งรอบ |
| [domain.ts](../../src/types/domain.ts) | Van, Booking, Driver, Transaction, UserRole, SessionUser และชนิดข้อมูลบัญชี/คิวประจำ |
| [date.ts](../../src/utils/date.ts) | วันที่และเวลาสำหรับ input กับการแสดงผลไทย |
| [vehicle.ts](../../src/utils/vehicle.ts) | ประเภทรถและจำนวนที่นั่ง |
| [ticket_schema.sql](../../api/ticket_schema.sql) | ตาราง ความสัมพันธ์ defaults และ indexes |

## ข้อควรจำเมื่อใช้ดัชนี

- GET /api/bookings รวมข้อมูล booking, ticket และ payment สำหรับหน้าตั๋ว; การมี /api/tickets ไม่ได้แปลว่าหน้าตั๋วเรียก endpoint นั้น
- GET /api/reports/daily ส่งรายการธุรกรรมด้วย แม้ชื่อ endpoint จะมีคำว่า daily
- POST /api/scan อัปเดตการเช็กอินจริง ไม่ใช่ endpoint อ่านสถานะอย่างเดียว
- การจ่ายเงินยังเป็น Demo และไม่มี external Payment Gateway
- ตำแหน่งบรรทัดเป็นทางลัด เมื่อแก้โค้ดแล้วชื่อฟังก์ชันเป็นจุดค้นที่คงทนกว่าเลขบรรทัด
