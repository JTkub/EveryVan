"""Generate the code map SVGs. Text is shaped by the browser when exported to PNG."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parent
INK = '#172b46'
MUTED = '#52657c'
BLUE = '#2765d7'
TEAL = '#087f74'
PURPLE = '#7852bd'
ORANGE = '#ad651a'
parts = []


def text(x, y, value, size=26, color=INK, weight=400, anchor='start'):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{escape(value)}</text>')


def rect(x, y, w, h, fill='#fff', stroke='#d6e0ec', radius=20):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')


def line(x1, y1, x2, y2, color='#d6e0ec'):
    parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="2"/>')


def arrow(points, color=BLUE, dashed=False):
    d = 'M' + ' L'.join(f'{x} {y}' for x, y in points)
    dash = ' stroke-dasharray="12 9"' if dashed else ''
    marker = {'#2765d7': 'blue', '#087f74': 'teal', '#7852bd': 'purple'}[color]
    parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="4" stroke-linejoin="round"{dash} marker-end="url(#{marker})"/>')


def start(w, h, title, subtitle):
    global parts
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(title)}">',
             '<style>text{font-family:Tahoma,"Leelawadee UI",sans-serif}</style>', '<defs>']
    for name, color in [('blue', BLUE), ('teal', TEAL), ('purple', PURPLE)]:
        parts.append(f'<marker id="{name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="{color}"/></marker>')
    parts.extend(['</defs>', f'<rect width="{w}" height="{h}" fill="#f5f8fc"/>'])
    text(80, 82, 'EVERYVAN / CODE MAP', 25, BLUE, 700)
    text(80, 153, title, 54, INK, 700)
    text(80, 205, subtitle, 26, MUTED)


def save(name):
    (OUT / name).write_text('\n'.join(parts + ['</svg>']), encoding='utf-8')


def overview():
    start(2000, 1580, 'เว็บของเราเชื่อมกันอย่างไร',
          'อ่านตามลูกศร = เรียกใช้ / ส่งคำขอ  •  ข้อมูลตอบกลับย้อนเส้นเดิม  •  อิงโค้ด 15 ต.ค. 2026')
    text(80, 277, '01  หน้าจอที่ผู้ใช้เห็น', 28, BLUE, 700)
    text(700, 277, '02  ตัวกลางข้อมูลใน React', 28, BLUE, 700)
    text(1380, 277, '03  ตัวส่งคำขอไปเซิร์ฟเวอร์', 28, BLUE, 700)

    rect(80, 310, 470, 380, '#ffffff')
    text(112, 365, 'src/main.tsx → App.tsx', 29, INK, 700)
    text(112, 416, 'VanProvider ครอบ Dashboard', 26)
    text(112, 470, 'ยังไม่ล็อกอิน → AuthView', 26)
    text(112, 515, 'ล็อกอินแล้ว → DashboardContent', 25)
    line(112, 541, 518, 541)
    text(112, 584, 'เลือกหน้าจอด้วย active + role', 26, BLUE)
    text(112, 626, 'จองตั๋ว / จัดคิว / คนขับ / บัญชี', 25)
    text(112, 666, 'หน้าส่วนใหญ่อยู่ใน App.tsx', 25, MUTED)

    rect(700, 310, 530, 380, '#edf4ff', '#c8dafa')
    text(732, 365, 'src/context/VanContext.tsx', 29, INK, 700)
    text(732, 417, 'useVan() ให้หน้าเว็บใช้ข้อมูลร่วมกัน', 26)
    text(732, 469, 'ผู้ใช้ • เที่ยวรถ • คนขับ • การจอง', 26)
    text(732, 512, 'ธุรกรรม • แจ้งเตือน', 26)
    line(732, 541, 1198, 541, '#c8dafa')
    text(732, 584, 'bookTicket / confirmPayment / ...', 25, BLUE)
    text(732, 627, 'refreshDatabase() โหลดข้อมูลใหม่', 25)
    text(732, 667, 'ล็อกอินแล้วดึงข้อมูลทุก 5 วินาที', 25, MUTED)

    rect(1380, 310, 540, 380, '#edf4ff', '#c8dafa')
    text(1412, 365, 'src/services/api.ts', 31, INK, 700)
    text(1412, 417, 'รวม request() และแปลงข้อมูล', 27)
    text(1412, 469, 'fetch + JSON + Bearer token', 27, BLUE)
    text(1412, 514, 'ปลายทาง /api หรือ VITE_API_URL', 25)
    line(1412, 541, 1888, 541, '#c8dafa')
    text(1412, 584, 'Dev: Vite proxy → :5000', 26)
    text(1412, 626, 'Docker: Nginx /api → api:5000', 25)
    text(1412, 666, 'เก็บ session ใน localStorage', 25, MUTED)

    arrow([(550, 428), (700, 428)])
    text(625, 401, 'useVan()', 21, BLUE, anchor='middle')
    arrow([(1230, 428), (1380, 428)])
    text(1305, 401, 'api.*', 23, BLUE, anchor='middle')
    arrow([(550, 609), (620, 609), (620, 770), (1650, 770), (1650, 690)], PURPLE, True)
    text(710, 750, 'เรียก api.ts ตรง: จัดการบัญชี / ผู้ติดตาม / สแกน QR / คิวประจำ', 25, PURPLE)

    text(80, 862, '06  งานที่รันเบื้องหลัง', 28, TEAL, 700)
    text(700, 862, '05  ฐานข้อมูลถาวร', 28, TEAL, 700)
    text(1380, 862, '04  ตรวจสิทธิ์และทำงานจริง', 28, TEAL, 700)
    rect(80, 899, 470, 420, '#f0faf7', '#c3e4db')
    text(112, 957, 'api/maintenance.py', 30, INK, 700)
    text(112, 1006, 'scheduler ทำงานทุก 30 วินาที', 25)
    text(112, 1050, 'เรียก api/recurring.py', 26, TEAL)
    text(112, 1100, 'สร้างเที่ยวรถในช่วง 7 วัน', 26)
    text(112, 1142, 'ยกเลิกการจองที่หมดเวลา', 25)
    text(112, 1184, 'สร้างแจ้งเตือนก่อนออกเดินทาง', 25)
    line(112, 1210, 518, 1210, '#c3e4db')
    text(112, 1255, 'ใช้ฐานข้อมูลเดียวกับ API', 26, TEAL)
    text(112, 1295, 'ทำงานได้แม้ไม่มีคนเปิดเว็บ', 25, MUTED)

    rect(700, 899, 530, 420, '#f0faf7', '#c3e4db')
    text(732, 957, 'PostgreSQL', 34, INK, 700)
    text(732, 1006, 'โครงสร้าง: api/ticket_schema.sql', 25, TEAL)
    text(732, 1054, 'app_user / auth_session / บทบาท', 25)
    text(732, 1097, 'route / vehicle / schedule / trip', 25)
    text(732, 1140, 'booking / payment / ticket', 25)
    text(732, 1183, 'recurring_schedule / driver_review', 24)
    text(732, 1226, 'notification / travel_follower', 25)
    text(732, 1269, 'audit_log', 25)

    rect(1380, 899, 540, 420, '#f0faf7', '#c3e4db')
    text(1412, 957, 'api/app.py — Flask API', 30, INK, 700)
    text(1412, 1006, 'รับ /api/* และตรวจสิทธิ์แต่ละบทบาท', 25)
    text(1412, 1055, 'จอง / จ่าย / ออกตั๋ว / เช็กอิน / จัดคิว', 25)
    text(1412, 1098, 'อ่านและเขียน SQL ผ่าน psycopg', 26, TEAL)
    line(1412, 1126, 1888, 1126, '#c3e4db')
    text(1412, 1171, 'security.py: รหัสผ่าน + session token', 24)
    text(1412, 1214, 'recurring.py: สร้าง / ปรับคิวประจำ', 25)
    text(1412, 1260, 'ก่อนรับคำขอมี maintenance ช่วยอีกทาง', 23, MUTED)
    text(1412, 1297, 'ตรรกะ backend หลักรวมอยู่ในไฟล์นี้', 24, MUTED)

    arrow([(1800, 690), (1800, 899)], TEAL)
    text(1820, 838, 'HTTP', 24, TEAL)
    arrow([(1380, 1070), (1230, 1070)], TEAL)
    text(1305, 1044, 'SQL', 23, TEAL, anchor='middle')
    arrow([(550, 1070), (700, 1070)], TEAL)
    text(625, 1044, 'SQL', 23, TEAL, anchor='middle')

    line(80, 1370, 1920, 1370)
    text(80, 1423, 'ไฟล์ช่วย: types/domain.ts = รูปแบบข้อมูล  •  utils/date.ts / vehicle.ts = วันที่และความจุรถ', 27)
    text(80, 1470, 'App.css + index.css = หน้าตาเว็บ  •  public/ = รูปภาพและ favicon', 27, MUTED)
    text(80, 1535, 'ชำระเงินยังเป็น Demo  •  การจอง ตั๋ว และ QR เช็กอินบันทึกจริงใน PostgreSQL', 27, ORANGE)
    save('everyvan-system-map.svg')


def feature_map():
    start(2200, 2250, 'อยากแก้ส่วนไหน ต้องเปิดไฟล์อะไร',
          'ทุกแถว → src/services/api.ts → Flask api/app.py → PostgreSQL  •  เส้นประ = เรียก API ตรง')
    rect(80, 252, 2040, 108, '#edf4ff', '#c8dafa')
    text(112, 295, 'จุดประกอบหน้าจอ: App.tsx → VanProvider → Dashboard → AuthView หรือ DashboardContent', 29, INK, 700)
    text(112, 338, 'DashboardContent เลือกหน้าโดย active และ role  •  ภาพรวมแยก passenger / driver / queue / finance / admin', 26, MUTED)
    text(100, 424, 'หน้าจอ / ฟีเจอร์', 30, INK, 700)
    text(670, 424, 'ไฟล์ที่ต้องเปิด', 30, INK, 700)
    text(1200, 424, 'ทางที่เรียกข้อมูล', 30, INK, 700)
    text(1690, 424, 'API หลัก (ต่อจาก /api)', 28, INK, 700)
    rows = [
        ('เข้าสู่ระบบ / สมัครสมาชิก', 'AuthView', ['src/view/AuthView.tsx'], ['VanContext', 'login / registerUser'], ['/auth/login', '/auth/register, /auth/session'], False),
        ('ค้นหาเที่ยวรถ / จอง / จ่าย', 'PassengerOverview · BookingPage', ['src/App.tsx'], ['VanContext', 'bookTicket / confirmPayment'], ['GET /trips', 'POST /bookings, /bookings/:id/pay'], False),
        ('ตั๋วของฉัน / ยกเลิก / รีวิว', 'TicketsPageV2', ['src/App.tsx'], ['VanContext', 'cancelBooking / addReview'], ['GET /bookings, POST .../cancel', 'POST /drivers/:id/reviews'], False),
        ('งานคนขับ / สถานะเที่ยว / ผู้โดยสาร', 'DriverOverview · OperationsPage', ['src/App.tsx'], ['VanContext', 'updateVanStatus / board / alight'], ['PATCH /trips/:id/status, /location', 'POST .../board, /alight, /complete'], False),
        ('จัดคิว / เพิ่มเที่ยว / ปรับเวลา', 'QueueOverview · CreateTripPage · OperationsPage', ['src/App.tsx'], ['VanContext', 'สร้างเที่ยว / ปรับเวลาออก'], ['GET, POST /trips', 'PATCH /trips/:id/time'], False),
        ('ภาพรวมการเงิน / รายงาน', 'FinanceOverview · ReportsPage', ['src/App.tsx'], ['VanContext.transactions', 'รวมยอดบนเบราว์เซอร์'], ['GET /reports/daily'], False),
        ('ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน', 'ProfilePage', ['src/App.tsx'], ['VanContext', 'แก้โปรไฟล์ / เปลี่ยนรหัสผ่าน'], ['PUT /auth/profile', 'PUT /auth/password'], False),
        ('จัดการบัญชีพนักงาน / ลูกค้า', 'AdminAccountsPage', ['src/App.tsx'], ['api.admin.* โดยตรง'], ['/admin/users', '/admin/employees'], True),
        ('สแกนตั๋วและเช็กอิน', 'ScannerPage', ['src/App.tsx'], ['api.scanner.scan โดยตรง', 'เสร็จแล้ว refreshDatabase()'], ['POST /scan', 'paid → boarded ในคำขอเดียว'], True),
        ('ผู้ติดตามการเดินทาง', 'FollowersPage', ['src/App.tsx'], ['api.followers.* โดยตรง'], ['GET, POST /followers', 'PATCH, DELETE /followers/:id'], True),
        ('คิวสายประจำอัตโนมัติ', 'RecurringSchedules (อยู่ใน CreateTripPage)', ['src/view/', 'RecurringSchedules.tsx'], ['api.recurring.* โดยตรง', 'เสร็จแล้ว refreshDatabase()'], ['/recurring-schedules', 'GET, POST และ PUT /:id'], True),
    ]
    for i, (title, comp, files, calls, endpoints, direct) in enumerate(rows):
        y = 463 + i * 142
        if i % 2 == 0:
            rect(80, y, 2040, 142, '#ffffff', '#ffffff', 0)
        line(80, y + 142, 2120, y + 142)
        text(100, y + 49, title, 27, INK, 700)
        text(100, y + 96, comp, 21, MUTED)
        for j, s in enumerate(files):
            text(670, y + 52 + j * 39, s, 25, BLUE)
        for j, s in enumerate(calls):
            text(1200, y + 52 + j * 40, s, 23 if j else 25, PURPLE if direct else BLUE)
        for j, s in enumerate(endpoints):
            text(1690, y + 52 + j * 40, s, 22, TEAL)
        arrow([(1100, y + 69), (1170, y + 69)], PURPLE if direct else BLUE, direct)
        arrow([(1587, y + 69), (1660, y + 69)], PURPLE if direct else BLUE, direct)
    text(80, 2090, 'ส่วนร่วม: Sidebar / Topbar อยู่ใน App.tsx  •  แจ้งเตือนผ่าน VanContext → /notifications และ /notifications/read', 27)
    text(80, 2140, 'ตั๋วแสดง QR ด้วย qrcode.react  •  Scanner เปิดกล้องและอ่าน QR ด้วย jsqr  •  /scan เช็กอินและบันทึก scanned_at', 27)
    text(80, 2190, 'ตารางนี้จับคู่โค้ดและ API หลักของแต่ละฟีเจอร์ ไม่ใช่ตารางสิทธิ์ของบทบาทหรือรายการ endpoint ทั้งหมด', 26, MUTED)
    save('everyvan-feature-map.svg')


if __name__ == '__main__':
    overview()
    feature_map()
