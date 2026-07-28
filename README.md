# EveryVan

ระบบจองตั๋วรถตู้ประกอบด้วย React + TypeScript + Vite, Flask API และ PostgreSQL

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
