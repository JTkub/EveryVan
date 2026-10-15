# EveryVan — แผนผังโค้ดและความเชื่อมโยง

ตรวจจาก source code วันที่ **15 ตุลาคม 2026** แผนผังอธิบาย implementation ในโฟลเดอร์ EveryVan ไม่ใช่ผลตรวจบริการที่กำลังรัน

- [ภาพรวมระบบ PNG](everyvan-system-map.png) — หน้าจอ → Context / API client → Flask → PostgreSQL รวม scheduler
- [จับคู่หน้าจอ–ไฟล์–API PNG](everyvan-feature-map.png) — เปิดไฟล์ไหนเมื่อจะแก้แต่ละฟีเจอร์
- [ภาพรวม SVG](everyvan-system-map.svg) และ [รายละเอียด SVG](everyvan-feature-map.svg) — ซูมได้โดยตัวหนังสือไม่แตก
- [Mermaid source](everyvan-system-map.mmd) — สำหรับแก้แผนผังและนำไปใช้ต่อ

ลูกศรแสดงทิศทางเรียกใช้ ส่วนข้อมูลตอบกลับย้อนทางเดิม เส้นประสีม่วงในภาพหมายถึงหน้าที่เรียก api.ts โดยตรง แต่หน้าเหล่านี้ยังอาจอ่านผู้ใช้และเรียก refreshDatabase ผ่าน Context ด้วย

## จุดอ้างอิงในโค้ด

| ส่วน | Source ที่ตรวจ |
|---|---|
| เริ่ม React | `src/main.tsx`, `src/App.tsx` ฟังก์ชัน `App`, `Dashboard`, `DashboardContent` |
| หน้าจอและเมนูตามบทบาท | `src/App.tsx` ฟังก์ชัน `Sidebar`, `DashboardContent` และ page functions |
| ล็อกอิน/สมัคร | `src/view/AuthView.tsx` → `VanContext.login/registerUser` |
| Shared state และ polling | `src/context/VanContext.tsx` → `refreshDatabase`, interval 5000 ms |
| HTTP และ endpoint mapping | `src/services/api.ts` → `request`, `api` |
| API ตรง | `AdminAccountsPage`, `FollowersPage`, `ScannerPage` ใน App.tsx และ `src/view/RecurringSchedules.tsx` |
| Backend และสิทธิ์ | `api/app.py` → `require`, endpoint functions และ `before` |
| รหัสผ่านและ token | `api/security.py` |
| ฐานข้อมูล | `api/ticket_schema.sql` และ SQL ใน app.py / recurring.py |
| งานเบื้องหลัง | `api/maintenance.py` → `run_once`, interval 30 วินาที |
| คิวสายประจำ | `api/recurring.py` → `generate_daily_trips` |
| Proxy / deployment | `vite.config.ts`, `nginx.conf`, `docker-compose.yml` |
| Types / utility / style | `src/types/domain.ts`, `src/utils/date.ts`, `src/utils/vehicle.ts`, `src/App.css`, `src/index.css` |

## รายละเอียดที่มีผลต่อการอ่านภาพ

- `App.tsx` รวมหลายหน้าจอไว้ในไฟล์เดียว; ชื่ออย่าง BookingPage หรือ ReportsPage เป็นฟังก์ชันในไฟล์นี้ ไม่ใช่ไฟล์แยก
- หน้าเปลี่ยนด้วย React state (`active`) ไม่ได้ใช้ React Router
- `TicketsPageV2` อ่านตั๋วผ่านข้อมูลจาก `GET /api/bookings` และวาด QR ด้วย `qrcode.react`
- `ScannerPage` เปิดกล้องและ decode ด้วย `jsqr`; `POST /api/scan` ตรวจตั๋วและเช็กอิน `paid → boarded` พร้อมบันทึก `scanned_at` ใน transaction เดียว
- `ReportsPage` คำนวณยอดรวมใน browser จาก `VanContext.transactions` ซึ่งมาจาก `GET /api/reports/daily`
- `VanContext` poll ทุก 5 วินาทีหลังล็อกอิน แต่หน้าที่โหลดข้อมูลตรงบางหน้ามี state / load ของตัวเอง
- Scheduler รันแยกทุก 30 วินาที ใช้ PostgreSQL เดียวกับ API; API มี maintenance ก่อนรับคำขอเป็นทางสำรองด้วย
- งานคิวประจำอ่าน `recurring_schedule` แล้วสร้างหรือปรับ `trip` / `schedule` ในช่วง 7 วันตามเวลาไทย โดยคงเที่ยวที่มีผู้จองหรือถูกปรับเวลาเฉพาะวัน
- การจ่ายเงินยังเป็น Demo ไม่มี external Payment Gateway; การจอง การชำระสถานะ ตั๋ว และเช็กอินบันทึกใน PostgreSQL
- localStorage ใช้เก็บ session และแจ้งเตือนบางส่วน ไม่ใช่ฐานสำรองจำลองสำหรับเที่ยวรถหรือการจอง
- ภาพเป็นระดับ module / feature จึงไม่ได้วาดทุก import, endpoint หรือ foreign key

## สร้างรูปใหม่

`render_maps.py` ใช้ Python standard library เพื่อสร้าง SVG จากข้อความและตำแหน่งที่กำหนดไว้; `export_maps.cjs` ใช้ Playwright + Chrome แปลงเป็น PNG พร้อมจัดรูปอักษรไทยและตรวจขอบเขตข้อความ

รันจากโฟลเดอร์ EveryVan:

```powershell
python docs/architecture/render_maps.py
$env:PLAYWRIGHT_MODULE = 'C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node docs/architecture/export_maps.cjs
```

หากติดตั้ง Playwright ใน Node environment อยู่แล้ว ไม่ต้องกำหนด `PLAYWRIGHT_MODULE` แผนผังเป็นเอกสารที่เรียบเรียงจากโค้ด ไม่ได้อัปเดตอัตโนมัติเมื่อ application เปลี่ยน
