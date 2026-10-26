"""Daily schedules use Bangkok dates, persistent occurrence IDs and a DB lock."""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation

try:
    from .journey import route_endpoints
except ImportError:
    from journey import route_endpoints

BANGKOK = timezone(timedelta(hours=7))
CAPACITIES = {"Toyota Commuter": 14, "Toyota Commuter Premium": 10, "Toyota Commuter VIP": 8}
HORIZON_DAYS = 7


def normalize_template(data):
    origin, destination = route_endpoints(data)
    plate = str(data.get("license_plate", "")).strip()
    vehicle_type = str(data.get("vehicle_type", ""))
    points = data.get("drop_off_points")
    if not destination or len(destination) > 150 or not plate or len(plate) > 20:
        raise ValueError("กรุณาระบุปลายทางและทะเบียนรถให้ถูกต้อง")
    if vehicle_type not in CAPACITIES:
        raise ValueError("ประเภทรถไม่ถูกต้อง")
    if not isinstance(points, list) or not all(isinstance(p, str) for p in points):
        raise ValueError("กรุณาระบุรายการจุดลงรถ")
    points = list(dict.fromkeys(p.strip() for p in points if p.strip()))
    if not 1 <= len(points) <= 30 or any(len(p) > 150 for p in points):
        raise ValueError("กรุณาระบุจุดลงรถ 1-30 จุด แต่ละจุดไม่เกิน 150 ตัวอักษร")
    try:
        departure = time.fromisoformat(data["departure_time"])
        start = date.fromisoformat(data["start_date"])
        duration = int(data.get("duration_minutes", 120))
        driver = int(data["driver_id"])
        fare = Decimal(str(data["price"]))
        seats = int(data.get("total_seats", CAPACITIES[vehicle_type]))
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise ValueError("เวลา วันที่ คนขับ หรือค่าโดยสารไม่ถูกต้อง") from None
    if departure.tzinfo or departure.second or departure.microsecond:
        raise ValueError("กรุณาระบุเวลาในรูปแบบ HH:MM ตามเวลาประเทศไทย")
    if not 1 <= duration <= 1440 or driver <= 0 or seats != CAPACITIES[vehicle_type]:
        raise ValueError("ระยะเวลาเดินทาง คนขับ หรือจำนวนที่นั่งไม่ถูกต้อง")
    if not fare.is_finite() or fare < 0 or fare > Decimal("99999999.99") or fare.as_tuple().exponent < -2:
        raise ValueError("ค่าโดยสารต้องเป็นจำนวนเงินไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง")
    enabled = data.get("enabled", True)
    if not isinstance(enabled, bool):
        raise ValueError("สถานะสายประจำไม่ถูกต้อง")
    return dict(origin=origin, destination=destination, license_plate=plate, vehicle_type=vehicle_type,
                drop_off_points=points, departure_time=departure, start_date=start,
                duration_minutes=duration, driver_id=driver, fare=fare,
                total_seats=seats, enabled=enabled)


def lock_generation(cursor):
    # Shared across API workers and the background scheduler; held until commit.
    cursor.execute("SELECT pg_advisory_xact_lock(73819024)")


def generate_daily_trips(connection, current=None):
    """Synchronize a seven-day window. Never rewrite booked or manually adjusted trips."""
    import json
    current = (current or datetime.now(BANGKOK)).astimezone(BANGKOK)
    today = current.date()
    created = 0
    with connection.cursor() as c:
        lock_generation(c)
        c.execute("SELECT * FROM recurring_schedule ORDER BY recurring_id FOR UPDATE")
        for template in c.fetchall():
            # Pause only unbooked, untouched future trips. Occurrence records remain
            # so resuming reactivates the same trip instead of creating duplicates.
            c.execute("""UPDATE schedule s SET active_status=FALSE
                FROM trip t WHERE t.schedule_id=s.schedule_id AND t.recurring_id=%s
                AND s.departure_time>%s AND t.trip_status='waiting' AND NOT t.schedule_override
                AND NOT EXISTS(SELECT 1 FROM booking b WHERE b.trip_id=t.trip_id
                    AND b.booking_status NOT IN ('cancelled','completed','alighted'))
                AND (%s=FALSE OR t.service_date<%s)""",
                (template["recurring_id"], current, template["enabled"], template["start_date"]))
            if not template["enabled"]:
                continue
            # Also update generated trips beyond the current window after an edit.
            c.execute("""SELECT t.trip_id,t.schedule_id,t.service_date FROM trip t
                JOIN schedule s USING(schedule_id) WHERE t.recurring_id=%s
                AND s.departure_time>%s AND t.trip_status='waiting' AND NOT t.schedule_override
                AND t.service_date>=%s AND NOT EXISTS(SELECT 1 FROM booking b
                    WHERE b.trip_id=t.trip_id AND b.booking_status NOT IN ('cancelled','completed','alighted'))
                ORDER BY t.trip_id FOR UPDATE OF t,s""",
                (template["recurring_id"], current, template["start_date"]))
            for trip in c.fetchall():
                dep = datetime.combine(trip["service_date"], template["departure_time"], BANGKOK)
                c.execute("UPDATE schedule SET departure_time=%s,arrive_time=%s,active_status=%s WHERE schedule_id=%s",
                          (dep, dep + timedelta(minutes=template["duration_minutes"]), dep > current, trip["schedule_id"]))
                c.execute("UPDATE trip SET route_id=%s,driver_id=%s,vehicle_id=%s,fare=%s,drop_off_points=%s::jsonb WHERE trip_id=%s",
                          (template["route_id"], template["driver_id"], template["vehicle_id"], template["fare"], json.dumps(template["drop_off_points"]), trip["trip_id"]))
            for offset in range(HORIZON_DAYS):
                service_date = today + timedelta(days=offset)
                dep = datetime.combine(service_date, template["departure_time"], BANGKOK)
                if service_date < template["start_date"] or dep <= current:
                    continue
                c.execute("SELECT 1 FROM trip WHERE recurring_id=%s AND service_date=%s",
                          (template["recurring_id"], service_date))
                if c.fetchone():
                    continue
                c.execute("INSERT INTO schedule(departure_time,arrive_time) VALUES(%s,%s) RETURNING schedule_id",
                          (dep, dep + timedelta(minutes=template["duration_minutes"])))
                schedule_id = c.fetchone()["schedule_id"]
                c.execute("""INSERT INTO trip(route_id,driver_id,vehicle_id,schedule_id,fare,drop_off_points,recurring_id,service_date)
                    VALUES(%s,%s,%s,%s,%s,%s::jsonb,%s,%s)""",
                    (template["route_id"], template["driver_id"], template["vehicle_id"], schedule_id,
                     template["fare"], json.dumps(template["drop_off_points"]), template["recurring_id"], service_date))
                created += 1
    return created
