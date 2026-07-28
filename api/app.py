from __future__ import annotations
import io, json, os, secrets, threading, time
from datetime import datetime, timezone, timedelta
from functools import wraps
from pathlib import Path
import psycopg, qrcode
from psycopg.rows import dict_row
from flask import Flask, g, jsonify, request, Response
from dotenv import load_dotenv
try:
    from .security import check_password, hash_password, hash_token, new_session_token
except ImportError:
    from security import check_password, hash_password, hash_token, new_session_token

ROOT=Path(__file__).resolve().parent
load_dotenv(ROOT.parent / ".env")
DATABASE_URL=os.getenv("DATABASE_URL","postgresql://postgres:everyvan123@localhost:5433/van_ticket_qr")
app=Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024
_schema_ready = False
_schema_lock = threading.Lock()
_next_maintenance_at = 0.0
_maintenance_lock = threading.Lock()
ALLOWED_ORIGINS={
    value.strip() for value in (
        os.getenv("CORS_ORIGINS")
        or os.getenv("CORS_ORIGIN")
        or "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if value.strip()
}
@app.errorhandler(psycopg.OperationalError)
def database_unavailable(_error):
    return jsonify(error="ไม่สามารถเชื่อมต่อ PostgreSQL ได้ กรุณาตรวจสอบ DATABASE_URL และสถานะฐานข้อมูล"),503
def db():
    if "db" not in g:
        g.db=psycopg.connect(DATABASE_URL,row_factory=dict_row)
        with g.db.cursor() as cursor:
            cursor.execute("SET TIME ZONE 'Asia/Bangkok'")
    return g.db
@app.teardown_appcontext
def close_db(exc=None):
    con=g.pop("db",None)
    if con: con.close()
@app.after_request
def cors(r):
    origin=request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        r.headers["Access-Control-Allow-Origin"]=origin
        r.headers["Vary"]="Origin"
    r.headers["Access-Control-Allow-Headers"]="Content-Type, Authorization"
    r.headers["Access-Control-Allow-Methods"]="GET, POST, PUT, PATCH, DELETE, OPTIONS"
    r.headers["X-Content-Type-Options"]="nosniff"
    r.headers["X-Frame-Options"]="DENY"
    r.headers["Referrer-Policy"]="same-origin"
    r.headers["Cache-Control"]="no-store" if request.path.startswith("/api/auth") else "private, max-age=0"
    return r
def now(): return datetime.now(timezone.utc)
def body(): return request.get_json(silent=True) or {}
def bearer_token():
    return request.headers.get("Authorization","").removeprefix("Bearer ").strip()
def uid():
    token=bearer_token()
    if not token:return None
    with db().cursor() as c:
        c.execute("SELECT s.user_id FROM auth_session s JOIN app_user u USING(user_id) WHERE s.token_hash=%s AND s.expires_at>NOW() AND u.is_active",(hash_token(token),))
        row=c.fetchone()
        return row["user_id"] if row else None
def current_user():
    if not uid(): return None
    with db().cursor() as c: c.execute("SELECT * FROM app_user WHERE user_id=%s",(uid(),)); return c.fetchone()
def require(*roles):
    def deco(fn):
        @wraps(fn)
        def wrap(*a,**kw):
            u=current_user()
            if not u: return jsonify(error="กรุณาเข้าสู่ระบบก่อนใช้งาน"),401
            if roles and u["role"] not in roles: return jsonify(error="บัญชีนี้ไม่มีสิทธิ์ทำรายการ"),403
            return fn(*a,**kw)
        return wrap
    return deco
def audit(action,entity,eid="",payload=None):
    with db().cursor() as c: c.execute("INSERT INTO audit_log(user_id,action,entity,entity_id,payload) VALUES(%s,%s,%s,%s,%s)",(uid(),action,entity,str(eid),json.dumps(payload or {})))
def notify_trip(trip_id, message, kind="schedule_change"):
    with db().cursor() as c:
        c.execute("INSERT INTO notification(user_id,message,notification_type) SELECT p.user_id,%s,%s FROM booking b JOIN passenger p USING(passenger_id) WHERE b.trip_id=%s AND b.booking_status NOT IN ('cancelled','completed')",(message,kind,trip_id))
def can_access_ticket(ticket_id, user):
    if not user: return False
    if user["role"] in ("staff","dispatcher","admin","accountant"): return True
    if user["role"]=="driver":
        with db().cursor() as c:
            c.execute("SELECT 1 FROM ticket t JOIN booking b USING(booking_id) JOIN trip tr USING(trip_id) JOIN driver d USING(driver_id) WHERE t.ticket_id=%s AND d.user_id=%s",(ticket_id,user["user_id"]))
            return c.fetchone() is not None
    if user["role"]!="passenger": return False
    with db().cursor() as c:
        c.execute("SELECT 1 FROM ticket t JOIN booking b USING(booking_id) JOIN passenger p USING(passenger_id) WHERE t.ticket_id=%s AND p.user_id=%s",(ticket_id,user["user_id"]))
        return c.fetchone() is not None
def can_access_booking(booking_id, user):
    """Passengers may only pay for or cancel their own booking."""
    if not user: return False
    if user["role"] in ("staff", "dispatcher", "admin"): return True
    if user["role"] != "passenger": return False
    with db().cursor() as c:
        c.execute("SELECT 1 FROM booking b JOIN passenger p USING(passenger_id) WHERE b.booking_id=%s AND p.user_id=%s",(booking_id,user["user_id"]))
        return c.fetchone() is not None
def can_manage_trip(trip_id, user):
    if user and user["role"] in ("staff","dispatcher","admin"): return True
    if not user or user["role"] != "driver": return False
    with db().cursor() as c:
        c.execute("SELECT 1 FROM trip t JOIN driver d USING(driver_id) WHERE t.trip_id=%s AND d.user_id=%s",(trip_id,user["user_id"]))
        return c.fetchone() is not None
def public_user(u):
    thai_id=""
    if u["role"]=="passenger":
        with db().cursor() as c:
            c.execute("SELECT id_card FROM passenger WHERE user_id=%s",(u["user_id"],))
            passenger=c.fetchone()
            thai_id=(passenger or {}).get("id_card") or ""
    return {"id":u["user_id"],"username":u.get("username") or u["email"],"role":u["role"],"profile":{"name":u["first_name"]+" "+u["last_name"],"dob":str(u["birthdate"] or ""),"phone":u["phone"] or "","email":u["email"],"thaiId":thai_id}}
EMPLOYEE_ROLES=("staff","dispatcher","accountant","driver")
def admin_user_record(user_id):
    with db().cursor() as c:
        c.execute("""
            SELECT u.user_id,u.username,u.first_name,u.last_name,u.birthdate,u.phone,u.email,
                   u.role,u.is_active,u.create_at,s.department,s.id_card staff_id_card,
                   d.license_id,p.id_card passenger_id_card
            FROM app_user u
            LEFT JOIN staff s ON s.user_id=u.user_id
            LEFT JOIN driver d ON d.user_id=u.user_id
            LEFT JOIN passenger p ON p.user_id=u.user_id
            WHERE u.user_id=%s
        """,(user_id,))
        row=c.fetchone()
    if not row:return None
    is_staff_role=row["role"] in ("staff","dispatcher","accountant")
    return {
        "id":row["user_id"],"username":row["username"] or row["email"],
        "name":f'{row["first_name"]} {row["last_name"]}',"dob":str(row["birthdate"] or ""),
        "phone":row["phone"] or "","email":row["email"],"role":row["role"],
        "isActive":row["is_active"],"createdAt":row["create_at"],
        "department":(row["department"] or "") if is_staff_role else "",
        "employeeId":(row["staff_id_card"] or "") if is_staff_role else "",
        "licenseId":(row["license_id"] or "") if row["role"]=="driver" else "",
        "thaiId":(row["passenger_id_card"] or "") if row["role"]=="passenger" else "",
    }
def seed():
    with db().cursor() as c:
        c.execute("SELECT COUNT(*) n FROM app_user")
        if c.fetchone()["n"]==0:
            for first,last,birth,phone,email,pw,role in [("Ratchapol","Thong-in","1998-04-12","0829998877","ratchapol@everyvan.com","pax","passenger"),("Somchai","Srichai","1982-08-20","0812345678","somchai@everyvan.com","driver","driver"),("Naree","Queue","1991-06-11","0811111111","staff@everyvan.com","staff","staff"),("Pimchanok","Account","1990-03-24","0822222222","accountant@everyvan.com","accountant","accountant"),("Phudanet","Silaart","1992-10-15","0851112233","admin@everyvan.com","admin","admin")]:
                c.execute("INSERT INTO app_user(first_name,last_name,username,birthdate,phone,email,password_user,role) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING user_id",(first,last,pw,birth,phone,email,hash_password(pw),role)); u=c.fetchone()["user_id"]
                if role=="passenger": c.execute("INSERT INTO passenger(user_id) VALUES(%s)",(u,))
                if role=="driver": c.execute("INSERT INTO driver(user_id,name,license_id,phone,photo) VALUES(%s,%s,%s,%s,%s)",(u,first+" "+last,"DL-100245",phone,"/driver-somchai.png"))
                if role in ("staff","accountant"): c.execute("INSERT INTO staff(user_id,department,id_card) VALUES(%s,%s,%s)",(u,"จัดคิวรถ" if role=="staff" else "ฝ่ายบัญชี","EMP-"+role.upper()))
        for first,last,birth,phone,email,pw,role,department in [("Naree","Queue","1991-06-11","0811111111","staff@everyvan.com","staff","staff","จัดคิวรถ"),("Pimchanok","Account","1990-03-24","0822222222","accountant@everyvan.com","accountant","accountant","ฝ่ายบัญชี")]:
            c.execute("SELECT user_id FROM app_user WHERE username=%s",(pw,)); existing=c.fetchone()
            if existing: u=existing["user_id"]
            else:
                c.execute("INSERT INTO app_user(first_name,last_name,username,birthdate,phone,email,password_user,role) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING user_id",(first,last,pw,birth,phone,email,hash_password(pw),role)); u=c.fetchone()["user_id"]
            c.execute("SELECT 1 FROM staff WHERE user_id=%s",(u,))
            if not c.fetchone(): c.execute("INSERT INTO staff(user_id,department,id_card) VALUES(%s,%s,%s)",(u,department,"EMP-"+role.upper()))
        c.execute("SELECT COUNT(*) n FROM route")
        if c.fetchone()["n"]==0:
            for i,dest in enumerate(["พัทยา","หัวหิน","ระยอง","จันทบุรี"],1):
                c.execute("INSERT INTO route(origin,destination) VALUES('กรุงเทพฯ',%s) RETURNING route_id",(dest,)); rid=c.fetchone()["route_id"]
                c.execute("SELECT driver_id FROM driver ORDER BY driver_id LIMIT 1"); did=c.fetchone()["driver_id"]
                c.execute("INSERT INTO vehicle(vehicle_type,status,license_plate,total_seats) VALUES('Toyota Commuter','waiting',%s,14) RETURNING vehicle_id",("10-"+str(2300+i)+" กรุงเทพฯ",)); vid=c.fetchone()["vehicle_id"]
                for n in range(1,15): c.execute("INSERT INTO seat(vehicle_id,seat_number) VALUES(%s,%s)",(vid,str(n)))
                dep=now()+timedelta(hours=i+1); c.execute("INSERT INTO schedule(departure_time,arrive_time) VALUES(%s,%s) RETURNING schedule_id",(dep,dep+timedelta(hours=2))); sid=c.fetchone()["schedule_id"]
                c.execute("INSERT INTO trip(route_id,driver_id,vehicle_id,schedule_id) VALUES(%s,%s,%s,%s)",(rid,did,vid,sid))
        c.execute("UPDATE driver d SET user_id=u.user_id FROM app_user u WHERE d.user_id IS NULL AND u.role='driver' AND d.phone=u.phone")
    db().commit()
def cleanup_expired():
    with db().cursor() as c:
        c.execute("UPDATE booking SET booking_status='cancelled' WHERE booking_status='pending' AND expires_at < NOW()")
        c.execute("UPDATE payment SET payment_status='cancelled' WHERE booking_id IN (SELECT booking_id FROM booking WHERE booking_status='cancelled') AND payment_status='unpaid'")
    db().commit()
def create_departure_notifications():
    with db().cursor() as c:
        c.execute("INSERT INTO notification(user_id,message,notification_type) SELECT DISTINCT p.user_id,'รถของคุณใกล้ถึงเวลาออกเดินทาง กรุณาเตรียมตัว','departure' FROM booking b JOIN passenger p USING(passenger_id) JOIN trip t ON t.trip_id=b.trip_id JOIN schedule s ON s.schedule_id=t.schedule_id WHERE b.booking_status='paid' AND s.departure_time BETWEEN NOW() AND NOW()+INTERVAL '15 minutes' AND NOT EXISTS (SELECT 1 FROM notification n WHERE n.user_id=p.user_id AND n.notification_type='departure' AND n.created_at > NOW()-INTERVAL '1 hour')")
    db().commit()
@app.before_request
def before():
    global _schema_ready, _next_maintenance_at
    if request.method=="OPTIONS": return "",204
    if request.path.startswith("/api/"):
        if not _schema_ready:
            with _schema_lock:
                if not _schema_ready:
                    with db().cursor() as c:
                        c.execute((ROOT/"ticket_schema.sql").read_text(encoding="utf8"))
                    db().commit()
                    seed()
                    _schema_ready=True
        current=time.monotonic()
        if current >= _next_maintenance_at and _maintenance_lock.acquire(blocking=False):
            try:
                cleanup_expired()
                create_departure_notifications()
                with db().cursor() as c:
                    c.execute("DELETE FROM auth_session WHERE expires_at<=NOW()")
                db().commit()
                _next_maintenance_at=current+30
            finally:
                _maintenance_lock.release()
@app.get("/api/health")
def health(): return jsonify(status="ok",database="postgresql")
@app.post("/api/auth/register")
def register():
    d=body(); parts=str(d.get("name","")).split(" ",1)
    username=str(d.get("username","")).strip().lower()
    thai_id=str(d.get("thaiId","")).strip()
    if not d.get("name") or not d.get("email") or not d.get("password") or not username: return jsonify(error="กรุณากรอกข้อมูลให้ครบ"),400
    if thai_id and (not thai_id.isdigit() or len(thai_id)!=13): return jsonify(error="เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),400
    try:
        with db().cursor() as c:
            c.execute("INSERT INTO app_user(first_name,last_name,username,birthdate,phone,email,password_user,role) VALUES(%s,%s,%s,%s,%s,%s,%s,'passenger') RETURNING *",(parts[0],parts[1] if len(parts)>1 else "-",username,d.get("dob") or None,d.get("phone"),d["email"].lower(),hash_password(d["password"])))
            u=c.fetchone(); c.execute("INSERT INTO passenger(user_id,id_card) VALUES(%s,%s)",(u["user_id"],thai_id or None)); db().commit(); return jsonify(user=public_user(u)),201
    except psycopg.errors.UniqueViolation: db().rollback(); return jsonify(error="ชื่อผู้ใช้ อีเมล หรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว"),409
@app.post("/api/auth/login")
def login():
    d=body(); key=d.get("username","").lower()
    with db().cursor() as c: c.execute("SELECT * FROM app_user WHERE username=%s OR email=%s OR email LIKE %s",(key,key,key+"@everyvan.com")); u=c.fetchone()
    if not u or not check_password(d.get("password",""),u["password_user"]): return jsonify(error="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"),401
    if not u["is_active"]: return jsonify(error="บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ"),403
    token=new_session_token()
    with db().cursor() as c:
        c.execute("INSERT INTO auth_session(token_hash,user_id) VALUES(%s,%s)",(hash_token(token),u["user_id"]))
    db().commit()
    return jsonify(token=token,user=public_user(u))
@app.get("/api/auth/session")
@require()
def session(): return jsonify(token=bearer_token(),user=public_user(current_user()))
@app.post("/api/auth/logout")
@require()
def logout():
    with db().cursor() as c:
        c.execute("DELETE FROM auth_session WHERE token_hash=%s",(hash_token(bearer_token()),))
    db().commit()
    return jsonify(ok=True)
@app.put("/api/auth/profile")
@require()
def profile():
    d=body(); p=str(d.get("name","")).split(" ",1)
    thai_id=str(d.get("thaiId","")).strip()
    if thai_id and (not thai_id.isdigit() or len(thai_id)!=13): return jsonify(error="เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),400
    try:
        with db().cursor() as c:
            c.execute("UPDATE app_user SET first_name=%s,last_name=%s,birthdate=%s,phone=%s,email=%s WHERE user_id=%s RETURNING *",(p[0],p[1] if len(p)>1 else "-",d.get("dob") or None,d.get("phone"),d.get("email"),uid())); u=c.fetchone()
            if u["role"]=="passenger": c.execute("UPDATE passenger SET id_card=%s WHERE user_id=%s",(thai_id or None,uid()))
            audit("profile.update","user",u["user_id"],{"updated_fields":["name","dob","phone","email","thaiId"]}); db().commit(); return jsonify(profile=public_user(u)["profile"])
    except psycopg.errors.UniqueViolation:
        db().rollback()
        return jsonify(error="อีเมลหรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว"),409
@app.put("/api/auth/password")
@require()
def change_password():
    d=body()
    current_password=str(d.get("currentPassword",""))
    new_password=str(d.get("newPassword",""))
    user=current_user()
    if not current_password or not new_password:return jsonify(error="กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่"),400
    if not check_password(current_password,user["password_user"]):return jsonify(error="รหัสผ่านปัจจุบันไม่ถูกต้อง"),400
    if len(new_password)<8:return jsonify(error="รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),400
    if check_password(new_password,user["password_user"]):return jsonify(error="รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน"),400
    token_hash=hash_token(bearer_token())
    with db().cursor() as c:
        c.execute("UPDATE app_user SET password_user=%s WHERE user_id=%s",(hash_password(new_password),user["user_id"]))
        c.execute("DELETE FROM auth_session WHERE user_id=%s AND token_hash<>%s",(user["user_id"],token_hash))
        audit("password.change","user",user["user_id"],{"other_sessions_revoked":True})
    db().commit()
    return jsonify(ok=True)
@app.get("/api/admin/users")
@require("admin")
def admin_users():
    query=str(request.args.get("q","")).strip()
    role=str(request.args.get("role","")).strip()
    status=str(request.args.get("status","")).strip()
    clauses=[]; params=[]
    if query:
        clauses.append("(u.username ILIKE %s OR u.email ILIKE %s OR u.phone ILIKE %s OR u.first_name||' '||u.last_name ILIKE %s)")
        params.extend([f"%{query}%"]*4)
    if role:
        if role not in ("passenger","admin",*EMPLOYEE_ROLES): return jsonify(error="ประเภทบัญชีไม่ถูกต้อง"),400
        clauses.append("u.role=%s"); params.append(role)
    if status in ("active","inactive"):
        clauses.append("u.is_active=%s"); params.append(status=="active")
    where=(" WHERE "+" AND ".join(clauses)) if clauses else ""
    with db().cursor() as c:
        c.execute("SELECT u.user_id FROM app_user u"+where+" ORDER BY CASE WHEN u.role='admin' THEN 0 WHEN u.role='passenger' THEN 2 ELSE 1 END,u.create_at DESC",params)
        ids=[row["user_id"] for row in c.fetchall()]
    return jsonify(users=[admin_user_record(user_id) for user_id in ids])
@app.post("/api/admin/employees")
@require("admin")
def create_employee():
    d=body()
    role=str(d.get("role","")).strip()
    name=str(d.get("name","")).strip()
    username=str(d.get("username","")).strip().lower()
    email=str(d.get("email","")).strip().lower()
    phone=str(d.get("phone","")).strip()
    password=str(d.get("password",""))
    parts=name.split(" ",1)
    if role not in EMPLOYEE_ROLES:return jsonify(error="เลือกบทบาทพนักงานไม่ถูกต้อง"),400
    if not name or not username or not email or not password:return jsonify(error="กรุณากรอกชื่อ ชื่อผู้ใช้ อีเมล และรหัสผ่านให้ครบ"),400
    if len(password)<8:return jsonify(error="รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),400
    employee_id=str(d.get("employeeId","")).strip()
    license_id=str(d.get("licenseId","")).strip()
    if role=="driver" and not license_id:return jsonify(error="กรุณาระบุเลขใบอนุญาตขับรถ"),400
    if role!="driver" and not employee_id:return jsonify(error="กรุณาระบุรหัสพนักงาน"),400
    con=db()
    try:
        with con.cursor() as c:
            c.execute("INSERT INTO app_user(first_name,last_name,username,birthdate,phone,email,password_user,role,is_active) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,TRUE) RETURNING user_id",(parts[0],parts[1] if len(parts)>1 else "-",username,d.get("dob") or None,phone,email,hash_password(password),role))
            user_id=c.fetchone()["user_id"]
            if role=="driver":
                c.execute("INSERT INTO driver(user_id,name,license_id,phone,photo) VALUES(%s,%s,%s,%s,%s)",(user_id,name,license_id,phone,d.get("photo") or ""))
            else:
                c.execute("INSERT INTO staff(user_id,department,id_card) VALUES(%s,%s,%s)",(user_id,str(d.get("department","")).strip(),employee_id))
            audit("employee.create","user",user_id,{"role":role,"username":username})
        con.commit()
        return jsonify(user=admin_user_record(user_id)),201
    except psycopg.errors.UniqueViolation:
        con.rollback()
        return jsonify(error="ชื่อผู้ใช้ อีเมล รหัสพนักงาน หรือเลขใบอนุญาตนี้ถูกใช้งานแล้ว"),409
    except psycopg.DataError:
        con.rollback()
        return jsonify(error="รูปแบบข้อมูลพนักงานไม่ถูกต้อง"),400
@app.patch("/api/admin/users/<int:user_id>")
@require("admin")
def update_managed_user(user_id):
    d=body()
    target=admin_user_record(user_id)
    if not target:return jsonify(error="ไม่พบบัญชีผู้ใช้"),404
    if target["role"]=="admin":return jsonify(error="แก้ไขบัญชีผู้ดูแลระบบจากหน้านี้ไม่ได้"),403
    role=str(d.get("role",target["role"])).strip()
    is_customer=target["role"]=="passenger"
    if is_customer and role!="passenger":return jsonify(error="ไม่สามารถเปลี่ยนบัญชีลูกค้าเป็นบัญชีพนักงานจากหน้านี้"),400
    if not is_customer and role not in EMPLOYEE_ROLES:return jsonify(error="เลือกบทบาทพนักงานไม่ถูกต้อง"),400
    name=str(d.get("name",target["name"])).strip()
    username=str(d.get("username",target["username"])).strip().lower()
    email=str(d.get("email",target["email"])).strip().lower()
    phone=str(d.get("phone",target["phone"])).strip()
    parts=name.split(" ",1)
    if not name or not username or not email:return jsonify(error="กรุณากรอกชื่อ ชื่อผู้ใช้ และอีเมลให้ครบ"),400
    active=d.get("isActive",target["isActive"])
    if not isinstance(active,bool):return jsonify(error="สถานะบัญชีไม่ถูกต้อง"),400
    password=str(d.get("password",""))
    if password and len(password)<8:return jsonify(error="รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),400
    employee_id=str(d.get("employeeId",target["employeeId"])).strip()
    license_id=str(d.get("licenseId",target["licenseId"])).strip()
    thai_id=str(d.get("thaiId",target["thaiId"])).strip()
    if is_customer and thai_id and (not thai_id.isdigit() or len(thai_id)!=13):return jsonify(error="เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),400
    if not is_customer and role=="driver" and not license_id:return jsonify(error="กรุณาระบุเลขใบอนุญาตขับรถ"),400
    if not is_customer and role!="driver" and not employee_id:return jsonify(error="กรุณาระบุรหัสพนักงาน"),400
    con=db()
    try:
        with con.cursor() as c:
            password_sql=",password_user=%s" if password else ""
            values=[parts[0],parts[1] if len(parts)>1 else "-",username,d.get("dob",target["dob"]) or None,phone,email,role,active]
            if password:values.append(hash_password(password))
            values.append(user_id)
            c.execute(f"UPDATE app_user SET first_name=%s,last_name=%s,username=%s,birthdate=%s,phone=%s,email=%s,role=%s,is_active=%s{password_sql} WHERE user_id=%s",values)
            if is_customer:
                c.execute("UPDATE passenger SET id_card=%s WHERE user_id=%s",(thai_id or None,user_id))
            elif role=="driver":
                c.execute("SELECT driver_id FROM driver WHERE user_id=%s",(user_id,))
                linked=c.fetchone()
                if linked:
                    c.execute("UPDATE driver SET name=%s,license_id=%s,phone=%s WHERE driver_id=%s",(name,license_id,phone,linked["driver_id"]))
                else:
                    c.execute("SELECT driver_id,user_id FROM driver WHERE license_id=%s",(license_id,))
                    by_license=c.fetchone()
                    if by_license and by_license["user_id"] is None:
                        c.execute("UPDATE driver SET user_id=%s,name=%s,phone=%s WHERE driver_id=%s",(user_id,name,phone,by_license["driver_id"]))
                    elif by_license:
                        raise psycopg.errors.UniqueViolation
                    else:
                        c.execute("INSERT INTO driver(user_id,name,license_id,phone,photo) VALUES(%s,%s,%s,%s,'')",(user_id,name,license_id,phone))
                c.execute("DELETE FROM staff WHERE user_id=%s",(user_id,))
            else:
                c.execute("INSERT INTO staff(user_id,department,id_card) VALUES(%s,%s,%s) ON CONFLICT(user_id) DO UPDATE SET department=EXCLUDED.department,id_card=EXCLUDED.id_card",(user_id,str(d.get("department",target["department"])).strip(),employee_id))
                if target["role"]=="driver":c.execute("UPDATE driver SET user_id=NULL WHERE user_id=%s",(user_id,))
            if password or not active:c.execute("DELETE FROM auth_session WHERE user_id=%s",(user_id,))
            audit("customer.update" if is_customer else "employee.update","user",user_id,{"role":role,"is_active":active,"password_reset":bool(password)})
        con.commit()
        return jsonify(user=admin_user_record(user_id))
    except psycopg.errors.UniqueViolation:
        con.rollback()
        return jsonify(error="ชื่อผู้ใช้ อีเมล เลขบัตร รหัสพนักงาน หรือเลขใบอนุญาตนี้ถูกใช้งานแล้ว"),409
    except psycopg.DataError:
        con.rollback()
        return jsonify(error="รูปแบบข้อมูลพนักงานไม่ถูกต้อง"),400
@app.get("/api/notifications")
@require()
def notifications():
    with db().cursor() as c:
        c.execute("SELECT notification_id,message,notification_type,is_read,created_at FROM notification WHERE user_id=%s ORDER BY created_at DESC LIMIT 30",(uid(),))
        return jsonify(notifications=c.fetchall())
@app.post("/api/notifications/read")
@require()
def read_notifications():
    with db().cursor() as c: c.execute("UPDATE notification SET is_read=TRUE WHERE user_id=%s",(uid(),)); db().commit()
    return jsonify(ok=True)
@app.get("/api/routes")
def routes():
    with db().cursor() as c: c.execute("SELECT * FROM route ORDER BY destination"); return jsonify(routes=c.fetchall())
@app.get("/api/drivers")
def drivers():
    with db().cursor() as c: c.execute("SELECT * FROM driver ORDER BY name"); return jsonify(drivers=c.fetchall())
@app.post("/api/drivers/<int:driver_id>/reviews")
@require("passenger")
def create_driver_review(driver_id):
    d=body()
    try: rating=int(d.get("rating"))
    except (TypeError,ValueError): return jsonify(error="คะแนนต้องเป็นตัวเลข 1 ถึง 5"),400
    comment=str(d.get("comment","")).strip()
    try: booking_id=int(d.get("booking_id"))
    except (TypeError,ValueError): return jsonify(error="กรุณาระบุเที่ยวที่เดินทางเสร็จแล้ว"),400
    if rating < 1 or rating > 5 or not comment:
        return jsonify(error="กรุณาให้คะแนน 1 ถึง 5 และระบุความคิดเห็น"),400
    with db().cursor() as c:
        c.execute("SELECT passenger_id FROM passenger WHERE user_id=%s",(uid(),))
        passenger=c.fetchone()
        if not passenger:return jsonify(error="ไม่พบข้อมูลผู้โดยสาร"),400
        c.execute("SELECT 1 FROM booking b JOIN trip t USING(trip_id) WHERE b.booking_id=%s AND b.passenger_id=%s AND t.driver_id=%s AND b.booking_status='completed'",(booking_id,passenger["passenger_id"],driver_id))
        if not c.fetchone():return jsonify(error="รีวิวได้เฉพาะเที่ยวของคุณที่เดินทางเสร็จแล้ว"),403
        try:
            c.execute("INSERT INTO driver_review(driver_id,passenger_id,booking_id,rating,comment) VALUES(%s,%s,%s,%s,%s) RETURNING *",(driver_id,passenger["passenger_id"],booking_id,rating,comment))
            review=c.fetchone()
        except psycopg.errors.UniqueViolation:
            db().rollback()
            return jsonify(error="คุณรีวิวเที่ยวนี้แล้ว"),409
        c.execute("UPDATE driver SET rating=(SELECT ROUND(AVG(rating)::numeric,1) FROM driver_review WHERE driver_id=%s) WHERE driver_id=%s",(driver_id,driver_id))
        audit("driver.review","driver",driver_id,{"rating":rating})
        db().commit()
        return jsonify(review=review),201
@app.get("/api/trips")
def trips():
    u=current_user()
    with db().cursor() as c:
        c.execute("SELECT t.trip_id,t.trip_status,t.fare,r.destination,s.departure_time,s.arrive_time,v.vehicle_type,v.license_plate,v.total_seats,d.driver_id,d.user_id driver_user_id,d.name driver_name,d.photo,d.license_id,COALESCE(array_agg(b.seat_number) FILTER(WHERE b.booking_status NOT IN ('cancelled','completed')),ARRAY[]::text[]) occupied FROM trip t JOIN route r USING(route_id) JOIN schedule s USING(schedule_id) JOIN vehicle v USING(vehicle_id) JOIN driver d USING(driver_id) LEFT JOIN booking b USING(trip_id) WHERE s.active_status GROUP BY t.trip_id,t.fare,r.destination,s.departure_time,s.arrive_time,v.vehicle_type,v.license_plate,v.total_seats,d.driver_id,d.user_id,d.name,d.photo,d.license_id ORDER BY s.departure_time")
        out=[]
        for x in c.fetchall():
            if u and u["role"]=="driver" and x["driver_user_id"] != u["user_id"]: continue
            if (not u or u["role"]=="passenger") and x["trip_status"] != "waiting": continue
            out.append({"id":str(x["trip_id"]),"plateNo":x["license_plate"],"vanType":x["vehicle_type"],"capacity":x["total_seats"],"status":x["trip_status"].title(),"destination":x["destination"],"departureTime":x["departure_time"].strftime("%H:%M"),"arrivalTime":x["arrive_time"].strftime("%H:%M") if x["arrive_time"] else None,"price":float(x["fare"]),"driverId":str(x["driver_id"]),"occupiedSeats":[int(s) for s in x["occupied"]],"date":x["departure_time"].date().isoformat(),"driver":{"name":x["driver_name"],"photo":x["photo"],"licenseNo":x["license_id"]}})
        return jsonify(vans=out)
@app.get("/api/trips/<int:trip_id>/seats")
def seats(trip_id):
    with db().cursor() as c: c.execute("SELECT v.total_seats,COALESCE(array_agg(b.seat_number) FILTER(WHERE b.booking_status NOT IN ('cancelled','completed')),ARRAY[]::text[]) occupied FROM trip t JOIN vehicle v USING(vehicle_id) LEFT JOIN booking b USING(trip_id) WHERE t.trip_id=%s GROUP BY v.total_seats",(trip_id,)); x=c.fetchone()
    if not x:return jsonify(error="ไม่พบเที่ยวรถ"),404
    return jsonify(total=x["total_seats"],occupied=x["occupied"])
@app.post("/api/trips")
@require("staff","dispatcher","admin")
def create_trip():
    d=body()
    destination=str(d.get("destination","")).strip()
    departure=d.get("departure_time")
    plate=str(d.get("license_plate","")).strip()
    raw_vehicle_id=d.get("vehicle_id")
    try:
        total_seats=int(d.get("total_seats",14))
        driver_id=int(d.get("driver_id"))
        vehicle_id=int(raw_vehicle_id) if raw_vehicle_id not in (None,"") else None
        fare=float(d.get("price",220))
    except (TypeError,ValueError):
        return jsonify(error="ข้อมูลคนขับ จำนวนที่นั่ง หรือค่าโดยสารไม่ถูกต้อง"),400
    if not destination or not departure or (vehicle_id is None and not plate):
        return jsonify(error="กรุณาระบุปลายทาง เวลาออกเดินทาง และข้อมูลรถ"),400
    if total_seats < 1 or total_seats > 30:
        return jsonify(error="จำนวนที่นั่งต้องอยู่ระหว่าง 1 ถึง 30"),400
    if fare < 0:
        return jsonify(error="ค่าโดยสารต้องไม่ติดลบ"),400
    con=db()
    try:
        with con.transaction():
            with con.cursor() as c:
                c.execute("SELECT 1 FROM driver WHERE driver_id=%s",(driver_id,))
                if not c.fetchone(): return jsonify(error="ไม่พบข้อมูลคนขับรถ"),404
                c.execute("INSERT INTO route(origin,destination) VALUES('กรุงเทพฯ',%s) ON CONFLICT(origin,destination) DO UPDATE SET destination=EXCLUDED.destination RETURNING route_id",(destination,))
                route=c.fetchone()["route_id"]
                if vehicle_id is not None:
                    c.execute("SELECT vehicle_id,total_seats FROM vehicle WHERE vehicle_id=%s",(vehicle_id,))
                    selected_vehicle=c.fetchone()
                    if not selected_vehicle:return jsonify(error="ไม่พบรถที่เลือก"),404
                    vehicle=selected_vehicle["vehicle_id"]
                else:
                    c.execute("INSERT INTO vehicle(vehicle_type,status,license_plate,total_seats) VALUES(%s,'waiting',%s,%s) ON CONFLICT(license_plate) DO UPDATE SET vehicle_type=EXCLUDED.vehicle_type,total_seats=EXCLUDED.total_seats RETURNING vehicle_id",(d.get("vehicle_type","Toyota Commuter"),plate,total_seats))
                    vehicle=c.fetchone()["vehicle_id"]
                    for number in range(1,total_seats+1):
                        c.execute("INSERT INTO seat(vehicle_id,seat_number) VALUES(%s,%s) ON CONFLICT DO NOTHING",(vehicle,str(number)))
                c.execute("INSERT INTO schedule(departure_time) VALUES(%s) RETURNING schedule_id",(departure,))
                schedule=c.fetchone()["schedule_id"]
                c.execute("INSERT INTO trip(route_id,driver_id,vehicle_id,schedule_id,fare) VALUES(%s,%s,%s,%s,%s) RETURNING *",(route,driver_id,vehicle,schedule,fare))
                trip=c.fetchone()
                audit("trip.create","trip",trip["trip_id"],d)
        con.commit()
        return jsonify(trip=trip),201
    except psycopg.errors.UniqueViolation:
        con.rollback()
        return jsonify(error="ข้อมูลเที่ยวรถซ้ำกับรายการที่มีอยู่"),409
@app.get("/api/bookings")
@require()
def bookings():
    u=current_user(); filt="AND p.user_id=%s" if u["role"]=="passenger" else "AND tr.driver_id IN (SELECT driver_id FROM driver WHERE user_id=%s)" if u["role"]=="driver" else ""
    with db().cursor() as c:
        c.execute("SELECT b.*,u.first_name||' '||u.last_name passenger_name,u.phone,r.destination,s.departure_time,v.license_plate,d.driver_id,d.name driver_name,d.photo driver_photo,t.ticket_id,t.qr_code,pm.payment_status,pm.receipt_no,pm.amount FROM booking b JOIN passenger p USING(passenger_id) JOIN app_user u USING(user_id) JOIN trip tr ON tr.trip_id=b.trip_id JOIN route r ON r.route_id=tr.route_id JOIN schedule s ON s.schedule_id=tr.schedule_id JOIN vehicle v ON v.vehicle_id=tr.vehicle_id JOIN driver d ON d.driver_id=tr.driver_id LEFT JOIN ticket t USING(booking_id) LEFT JOIN payment pm USING(booking_id) WHERE 1=1 "+filt+" ORDER BY b.booking_datetime DESC",((u["user_id"],) if filt else ())); return jsonify(bookings=c.fetchall())
@app.post("/api/bookings")
@require("passenger")
def create_booking():
    d=body()
    try:
        trip_id=int(d.get("trip_id"))
        seat_number=int(d.get("seat_number"))
    except (TypeError,ValueError):
        return jsonify(error="ข้อมูลเที่ยวรถหรือที่นั่งไม่ถูกต้อง"),400
    seat=str(seat_number)
    con=db()
    try:
        with con.transaction():
            with con.cursor() as c:
                c.execute("SELECT passenger_id FROM passenger WHERE user_id=%s",(uid(),))
                p=c.fetchone()
                if not p:return jsonify(error="ไม่พบข้อมูลผู้โดยสาร"),400
                c.execute("SELECT t.schedule_id,t.fare,t.trip_status,v.total_seats,s.active_status,s.departure_time FROM trip t JOIN vehicle v USING(vehicle_id) JOIN schedule s USING(schedule_id) WHERE t.trip_id=%s FOR UPDATE",(trip_id,))
                t=c.fetchone()
                if not t:return jsonify(error="ไม่พบเที่ยวรถ"),404
                if t["trip_status"] != "waiting" or not t["active_status"] or t["departure_time"] <= now():
                    return jsonify(error="เที่ยวรถนี้ปิดรับการจองแล้ว"),409
                if seat_number < 1 or seat_number > t["total_seats"]:
                    return jsonify(error="หมายเลขที่นั่งไม่ถูกต้อง"),400
                c.execute("SELECT 1 FROM booking WHERE trip_id=%s AND seat_number=%s AND booking_status NOT IN ('cancelled','completed')",(trip_id,seat))
                if c.fetchone():return jsonify(error="ที่นั่งนี้ถูกจองแล้ว"),409
                c.execute("INSERT INTO booking(passenger_id,trip_id,schedule_id,seat_number,boarding_point) VALUES(%s,%s,%s,%s,%s) RETURNING *",(p["passenger_id"],trip_id,t["schedule_id"],seat,d.get("boarding_point")))
                b=c.fetchone()
                c.execute("INSERT INTO payment(booking_id,amount) VALUES(%s,%s)",(b["booking_id"],t["fare"]))
                audit("booking.create","booking",b["booking_id"],d)
        con.commit()
        return jsonify(booking=b),201
    except psycopg.errors.UniqueViolation: con.rollback(); return jsonify(error="ที่นั่งนี้ถูกจองแล้ว"),409
@app.post("/api/bookings/<int:booking_id>/pay")
@require("passenger")
def pay(booking_id):
    if not can_access_booking(booking_id,current_user()): return jsonify(error="คุณไม่มีสิทธิ์เข้าถึงการจองนี้"),403
    with db().cursor() as c:
        c.execute("UPDATE booking SET booking_status='paid' WHERE booking_id=%s AND booking_status='pending' AND expires_at>NOW() RETURNING *",(booking_id,)); b=c.fetchone()
        if not b:return jsonify(error="ไม่พบรายการหรือชำระแล้ว"),400
        receipt="REC-"+secrets.token_hex(5).upper(); c.execute("UPDATE payment SET payment_status='success',method='promptpay',receipt_no=%s WHERE booking_id=%s",(receipt,booking_id)); c.execute("INSERT INTO ticket(booking_id,qr_code) VALUES(%s,%s) RETURNING *",(booking_id,secrets.token_urlsafe(22))); t=c.fetchone(); audit("payment.success","payment",booking_id,{"receipt":receipt}); db().commit(); return jsonify(booking=b,ticket=t,receipt_no=receipt)
@app.post("/api/bookings/<int:booking_id>/cancel")
@require("passenger","staff","dispatcher","admin")
def cancel(booking_id):
    if not can_access_booking(booking_id,current_user()): return jsonify(error="คุณไม่มีสิทธิ์เข้าถึงการจองนี้"),403
    with db().cursor() as c:
        c.execute("UPDATE booking SET booking_status='cancelled' WHERE booking_id=%s AND booking_status IN ('pending','paid') RETURNING *",(booking_id,))
        b=c.fetchone()
        if not b:return jsonify(error="ไม่พบรายการหรือสถานะนี้ไม่สามารถยกเลิกได้"),400
        c.execute("UPDATE payment SET payment_status='cancelled' WHERE booking_id=%s",(booking_id,))
        audit("booking.cancel","booking",booking_id)
        db().commit()
        return jsonify(booking=b)
@app.post("/api/bookings/<int:booking_id>/board")
@require("driver","staff","dispatcher","admin")
def board(booking_id):
    with db().cursor() as c: c.execute("SELECT trip_id FROM booking WHERE booking_id=%s",(booking_id,)); target=c.fetchone()
    if not target: return jsonify(error="ไม่พบการจอง"),404
    if not can_manage_trip(target["trip_id"],current_user()): return jsonify(error="คุณไม่มีสิทธิ์จัดการเที่ยวรถนี้"),403
    with db().cursor() as c: c.execute("UPDATE booking SET booking_status='boarded' WHERE booking_id=%s AND booking_status='paid' RETURNING *",(booking_id,)); b=c.fetchone(); c.execute("UPDATE ticket SET ticket_status='boarded',scanned_at=NOW() WHERE booking_id=%s",(booking_id,)); audit("booking.board","booking",booking_id); db().commit(); return jsonify(booking=b) if b else (jsonify(error="ตั๋วยังไม่ชำระเงิน"),400)
@app.get("/api/tickets")
@require()
def tickets():
    u=current_user(); condition=" WHERE p.user_id=%s" if u["role"] == "passenger" else " WHERE d.user_id=%s" if u["role"] == "driver" else ""
    sql="SELECT t.*,b.seat_number,b.booking_status,r.origin,r.destination,s.departure_time,v.license_plate,d.name driver_name,d.photo FROM ticket t JOIN booking b USING(booking_id) JOIN passenger p USING(passenger_id) JOIN trip tr ON tr.trip_id=b.trip_id JOIN route r ON r.route_id=tr.route_id JOIN schedule s ON s.schedule_id=tr.schedule_id JOIN vehicle v ON v.vehicle_id=tr.vehicle_id JOIN driver d ON d.driver_id=tr.driver_id"+condition+" ORDER BY t.ticket_id DESC"
    with db().cursor() as c: c.execute(sql,(u["user_id"],) if condition else ()); return jsonify(tickets=c.fetchall())
@app.get("/api/tickets/<int:ticket_id>/qr")
@require()
def ticket_qr(ticket_id):
    if not can_access_ticket(ticket_id,current_user()): return jsonify(error="คุณไม่มีสิทธิ์เข้าถึงตั๋วนี้"),403
    with db().cursor() as c: c.execute("SELECT * FROM ticket WHERE ticket_id=%s",(ticket_id,)); t=c.fetchone()
    if not t:return jsonify(error="ไม่พบตั๋ว"),404
    image=qrcode.make(json.dumps({"ticket_id":ticket_id,"qr_code":t["qr_code"]},separators=(",",":"))); out=io.BytesIO(); image.save(out,format="PNG"); return Response(out.getvalue(),mimetype="image/png")
@app.post("/api/scan")
@require("driver")
def scan():
    d=body(); raw=d.get("qr_payload") or d.get("qr_code"); code=raw.get("qr_code") if isinstance(raw,dict) else raw
    if isinstance(code,str) and code.lstrip().startswith("{"):
        try: code=json.loads(code).get("qr_code")
        except json.JSONDecodeError: pass
    with db().cursor() as c: c.execute("SELECT t.*,b.booking_status,b.seat_number,b.trip_id,pm.payment_status,r.destination,v.license_plate,s.departure_time FROM ticket t JOIN booking b USING(booking_id) JOIN payment pm USING(booking_id) JOIN trip tr ON tr.trip_id=b.trip_id JOIN route r ON r.route_id=tr.route_id JOIN vehicle v ON v.vehicle_id=tr.vehicle_id JOIN schedule s ON s.schedule_id=tr.schedule_id WHERE t.qr_code=%s",(code,)); t=c.fetchone()
    if not t:return jsonify(valid=False,status="ไม่พบตั๋ว"),404
    if not can_manage_trip(t["trip_id"],current_user()): return jsonify(valid=False,status="ตั๋วไม่ได้อยู่ในความรับผิดชอบของคุณ"),403
    return jsonify(valid=t["booking_status"] in ("paid","boarded"),ticket=t,payment_status=t["booking_status"])
@app.patch("/api/trips/<int:trip_id>/status")
@require("driver","staff","dispatcher","admin")
def trip_status(trip_id):
    if not can_manage_trip(trip_id,current_user()): return jsonify(error="คุณไม่มีสิทธิ์จัดการเที่ยวรถนี้"),403
    value=body().get("status","waiting").lower()
    if value not in ("waiting","travelling","departed","accident","completed"):
        return jsonify(error="สถานะเที่ยวรถไม่ถูกต้อง"),400
    with db().cursor() as c:
        c.execute("UPDATE trip SET trip_status=%s,real_departure_time=CASE WHEN %s='departed' THEN NOW() ELSE real_departure_time END WHERE trip_id=%s RETURNING *",(value,value,trip_id))
        x=c.fetchone()
        if not x:return jsonify(error="ไม่พบเที่ยวรถ"),404
        audit("trip.status","trip",trip_id,{"status":value})
        notify_trip(trip_id,f"สถานะเที่ยวรถของคุณเปลี่ยนเป็น {value}","trip_status")
        db().commit()
        return jsonify(trip=x)
@app.patch("/api/trips/<int:trip_id>/time")
@require("staff","dispatcher","admin")
def trip_time(trip_id):
    d=body()
    with db().cursor() as c:
        c.execute("UPDATE schedule SET departure_time=COALESCE(%s,departure_time),arrive_time=COALESCE(%s,arrive_time) WHERE schedule_id=(SELECT schedule_id FROM trip WHERE trip_id=%s) RETURNING *",(d.get("departure_time"),d.get("arrive_time"),trip_id)); x=c.fetchone()
        if not x:return jsonify(error="ไม่พบเที่ยวรถ"),404
        audit("trip.time","trip",trip_id,d); notify_trip(trip_id,"เวลาเดินทางของเที่ยวรถมีการเปลี่ยนแปลง","schedule_change"); db().commit(); return jsonify(schedule=x)
@app.post("/api/trips/<int:trip_id>/incident")
@require("driver","staff","dispatcher","admin")
def trip_incident(trip_id):
    if not can_manage_trip(trip_id,current_user()): return jsonify(error="คุณไม่มีสิทธิ์จัดการเที่ยวรถนี้"),403
    d=body(); detail=str(d.get("detail","")).strip()
    incident_type=str(d.get("incident_type","breakdown")).strip().lower()
    if not detail: return jsonify(error="กรุณาระบุรายละเอียดเหตุขัดข้อง"),400
    if incident_type not in ("breakdown","accident"): return jsonify(error="ประเภทเหตุการณ์ไม่ถูกต้อง"),400
    with db().cursor() as c:
        c.execute("UPDATE trip SET trip_status='accident' WHERE trip_id=%s RETURNING *",(trip_id,)); trip=c.fetchone()
        if not trip: return jsonify(error="ไม่พบเที่ยวรถ"),404
        action="trip.accident" if incident_type=="accident" else "trip.breakdown"
        label="อุบัติเหตุ" if incident_type=="accident" else "เหตุขัดข้อง"
        audit(action,"trip",trip_id,{"detail":detail})
        notify_trip(trip_id,f"แจ้ง{label}ระหว่างเดินทาง: {detail}","incident")
        db().commit(); return jsonify(trip=trip),201
@app.post("/api/trips/<int:trip_id>/complete")
@require("driver","staff","dispatcher","admin")
def complete_trip(trip_id):
    if not can_manage_trip(trip_id,current_user()): return jsonify(error="คุณไม่มีสิทธิ์จัดการเที่ยวรถนี้"),403
    with db().cursor() as c:
        c.execute("UPDATE trip SET trip_status='completed',real_arrival_time=NOW() WHERE trip_id=%s RETURNING *",(trip_id,)); trip=c.fetchone()
        if not trip: return jsonify(error="ไม่พบเที่ยวรถ"),404
        c.execute("UPDATE schedule SET active_status=FALSE WHERE schedule_id=%s",(trip["schedule_id"],))
        c.execute("UPDATE booking SET booking_status='completed' WHERE trip_id=%s AND booking_status IN ('paid','boarded')",(trip_id,))
        c.execute("UPDATE trip SET total_passengers=(SELECT COUNT(*) FROM booking WHERE trip_id=%s AND booking_status='completed') WHERE trip_id=%s",(trip_id,trip_id))
        audit("trip.complete","trip",trip_id); notify_trip(trip_id,"เที่ยวรถเดินทางถึงปลายทางเรียบร้อยแล้ว","trip_complete"); db().commit(); return jsonify(trip=trip)
@app.get("/api/reports/daily")
@require("accountant","staff","admin")
def report():
    with db().cursor() as c:
        c.execute("SELECT COUNT(*) count,COALESCE(SUM(amount),0) total FROM payment WHERE payment_status='success' AND (payment_datetime AT TIME ZONE 'Asia/Bangkok')::date=(NOW() AT TIME ZONE 'Asia/Bangkok')::date"); s=c.fetchone()
        c.execute("SELECT pm.*,u.first_name||' '||u.last_name passenger_name FROM payment pm JOIN booking b USING(booking_id) JOIN passenger p USING(passenger_id) JOIN app_user u USING(user_id) ORDER BY pm.payment_datetime DESC")
        return jsonify(summary=s,transactions=c.fetchall())
@app.get("/")
def index(): return jsonify(service="EveryVan API",health="/api/health")
if __name__=="__main__": app.run(host="0.0.0.0",port=int(os.getenv("PORT","5000")))
