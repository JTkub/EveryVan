# EveryVan

ระบบจองตั๋วรถตู้ประกอบด้วย React + TypeScript + Vite, Flask API และ PostgreSQL

## โครงสร้างโปรเจกต์

```text
EveryVan/
├─ src/                    React frontend
├─ api/
│  ├─ app.py              Flask API
│  ├─ ticket_schema.sql   PostgreSQL schema
│  ├─ Dockerfile          API image
│  ├─ backup.ps1          สำรองฐานข้อมูล
│  └─ restore.ps1         กู้คืนฐานข้อมูล
├─ Dockerfile             Frontend image
├─ docker-compose.yml     Web + API + PostgreSQL
├─ .env                   ค่าที่ใช้บนเครื่องนี้
└─ .env.example           ตัวอย่าง environment
```

## บัญชีทดลอง

- ผู้โดยสาร: `pax / pax`
- คนขับ: `driver / driver`
- พนักงานจัดคิว: `staff / staff`
- ฝ่ายบัญชี: `accountant / accountant`
- ผู้ดูแลระบบ: `admin / admin`

บัญชี `admin` เป็นสิทธิ์สูงสุดของระบบ เมนู **จัดการบัญชี** ใช้สำหรับ:

- เพิ่มและแก้ไขบัญชีพนักงานจัดคิว ผู้ควบคุมคิว ฝ่ายบัญชี และคนขับ
- เปลี่ยนบทบาท รีเซ็ตรหัสผ่าน และเปิด/ปิดการใช้งานบัญชีพนักงาน
- ค้นหา แก้ไขข้อมูล รีเซ็ตรหัสผ่าน และเปิด/ปิดการใช้งานบัญชีลูกค้า
- ผู้ใช้ทุกบทบาทเปลี่ยนรหัสผ่านของตัวเองได้จากหน้า **ข้อมูลส่วนตัว**

ระบบไม่สร้างบทบาท Super Admin เพิ่ม บัญชีผู้ดูแลเดิมยังคงเป็นระดับสูงสุด

## รันด้วย Docker Compose

เปิด PowerShell ที่โฟลเดอร์ `C:\Users\admin\Desktop\Ajone\EveryVan`

1. สร้างไฟล์ค่าระบบจากตัวอย่าง (ทำครั้งแรก หรือเมื่อรับโปรเจกต์จาก GitHub):

```powershell
Copy-Item .env.example .env
```

2. สร้าง volume เก็บข้อมูล (คำสั่งนี้รันซ้ำได้):

```powershell
docker volume create everyvan-db-data
```

3. Build และเปิดทั้งสามบริการ:

```powershell
docker compose up -d --build
```

4. ตรวจสถานะ:

```powershell
docker compose ps
```

เปิดใช้งาน:

- เว็บ: http://localhost:8080
- API health: http://localhost:5000/api/health
- PostgreSQL จากเครื่อง host: `localhost:5433`

ค่าฐานข้อมูลอยู่ใน `.env` โดยค่าเริ่มต้นคือ:

```env
POSTGRES_DB=van_ticket_qr
POSTGRES_USER=postgres
POSTGRES_PASSWORD=everyvan123
POSTGRES_PORT=5433
```

ไฟล์ `.env` ถูกละเว้นโดย Git เพราะมีรหัสผ่าน ให้ส่งหรืออัปโหลดเฉพาะ `.env.example` แล้วให้แต่ละเครื่องสร้าง `.env` ของตัวเองด้วยคำสั่งข้อ 1

ใช้พอร์ต `5433` ฝั่ง host เพื่อไม่ชนกับ PostgreSQL ที่ติดตั้งบนเครื่องซึ่งมักใช้ `5432`

### หยุดและรันใหม่

1. หยุดโดยเก็บข้อมูลไว้:

```powershell
docker compose down
```

2. รันใหม่:

```powershell
docker compose up -d
```

3. Build ใหม่หลังแก้โค้ด:

```powershell
docker compose up -d --build
```

4. ดู log:

```powershell
docker compose logs -f
```

กด `Ctrl+C` เพื่อออกจากหน้าดู log โดย container ยังทำงานต่อ

### ล้างฐานข้อมูลทั้งหมด

คำสั่งต่อไปนี้ลบข้อมูล PostgreSQL ใน Docker อย่างถาวร:

```powershell
docker compose down; docker volume rm everyvan-db-data
```

ก่อนรันควรสำรองข้อมูลหากมีข้อมูลที่ต้องเก็บ

## รันแบบไม่ใช้ Docker

ต้องมี PostgreSQL และฐานข้อมูล `van_ticket_qr` ที่ตรงกับ `DATABASE_URL` ใน `.env`

```powershell
npm ci
python -m pip install -r api/requirements.txt
npm start
```

- เว็บสำหรับพัฒนา: http://localhost:5173
- API: http://localhost:5000/api

`api/app.py` อ่าน `.env` อัตโนมัติ และจะสร้าง schema/ข้อมูลเริ่มต้นเมื่อมี request แรก

## สำรองและกู้คืนฐานข้อมูล Docker

ตั้ง URL สำหรับฐานข้อมูลที่เปิดไว้บนพอร์ต `5433` แล้วรันสคริปต์:

```powershell
$env:DATABASE_URL='postgresql://postgres:everyvan123@localhost:5433/van_ticket_qr'; .\api\backup.ps1
```

```powershell
$env:DATABASE_URL='postgresql://postgres:everyvan123@localhost:5433/van_ticket_qr'; .\api\restore.ps1 -InputFile .\backups\everyvan-YYYYMMDD-HHMMSS.dump
```

## ตรวจคุณภาพโค้ด

```powershell
npm run check
```

คำสั่งนี้ตรวจ lint, frontend tests, production build และ backend tests

## ขอบเขตระบบ

ระบบจริงครอบคลุมการเข้าสู่ระบบ/สมัครสมาชิก, โปรไฟล์, เที่ยวรถ, เลือกที่นั่ง, จองและยกเลิก,
e-ticket/QR, คนขับสแกน QR จากกล้องและขึ้นรถ, จัดคิว, เปลี่ยนเวลา/สถานะ, แจ้งเหตุ, ปิดเที่ยว,
การแจ้งเตือน, รายงาน และการจัดการบัญชีพนักงาน/ดูบัญชีลูกค้าโดยผู้ดูแลระบบ
ส่วนการชำระเงินเป็น mock ตามขอบเขตโครงงานและไม่มีการตัดเงินจริง

> การสแกน QR ต้องอนุญาตสิทธิ์กล้องในเบราว์เซอร์ และเปิดเว็บผ่าน `localhost`
> หรือ HTTPS (การเปิดผ่าน IP ภายในวง LAN ด้วย HTTP อาจไม่สามารถใช้กล้องได้)
