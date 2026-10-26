"""Integration tests only run against an explicitly configured disposable database."""
import importlib
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta


@unittest.skipUnless(os.getenv("EVERYVAN_TEST_DATABASE_URL"), "Use scripts/test-postgres.py for isolated PostgreSQL integration tests")
class RuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.api = importlib.import_module("api.app")
        cls.api.DATABASE_URL = os.environ["EVERYVAN_TEST_DATABASE_URL"]
        cls.api.app.config.update(TESTING=True)
        with cls.api.app.app_context():
            cls.api.initialize_schema()
        cls.api._next_maintenance_at = float("inf")

    def setUp(self):
        self.client = self.api.app.test_client()
        self.tokens = {}
        self.users = {}
        self.drivers = {}
        with self.api.app.app_context():
            with self.api.db().cursor() as c:
                c.execute("TRUNCATE app_user,route,vehicle,schedule RESTART IDENTITY CASCADE")
                for role in ("admin", "dispatcher", "staff", "accountant", "passenger", "driver", "other-driver"):
                    actual_role = "driver" if role == "other-driver" else role
                    c.execute("INSERT INTO app_user(first_name,last_name,username,email,password_user,role) VALUES(%s,'Test',%s,%s,%s,%s) RETURNING user_id",
                              (role, role, role + "@example.test", self.api.hash_password("integration-password"), actual_role))
                    user_id = c.fetchone()["user_id"]
                    self.users[role] = user_id
                    if actual_role == "passenger":
                        c.execute("INSERT INTO passenger(user_id) VALUES(%s)", (user_id,))
                    if actual_role == "driver":
                        c.execute("INSERT INTO driver(user_id,name,license_id) VALUES(%s,%s,%s) RETURNING driver_id", (user_id, role, role))
                        self.drivers[role] = c.fetchone()["driver_id"]
                self.api.db().commit()
        for role in self.users:
            response = self.client.post("/api/auth/login", json={"username": role, "password": "integration-password"})
            self.assertEqual(response.status_code, 200)
            self.tokens[role] = response.json["token"]

    def call(self, method, path, role="dispatcher", data=None, client=None):
        return (client or self.client).open("/api" + path, method=method, json=data,
                                           headers={"Authorization": "Bearer " + self.tokens[role]})

    def template(self):
        return dict(destination="Test destination", drop_off_points=["Stop A", "Stop B"],
                    departure_time="23:59", start_date=datetime.now(self.api.BANGKOK).date().isoformat(),
                    duration_minutes=120, vehicle_type="Toyota Commuter", license_plate="TEST-001",
                    total_seats=14, driver_id=self.drivers["driver"], price=220, enabled=True)

    def query(self, sql, params=()):
        with self.api.app.app_context():
            with self.api.db().cursor() as c:
                c.execute(sql, params)
                rows = c.fetchall() if c.description else []
                self.api.db().commit()
                return rows

    def generate(self, current=None):
        with self.api.app.app_context():
            result = self.api.generate_daily_trips(self.api.db(), current)
            self.api.db().commit()
            return result

    def trip(self, departure=None):
        data = self.template()
        data["departure_time"] = (departure or (datetime.now(self.api.BANGKOK) + timedelta(minutes=10))).isoformat()
        result = self.call("POST", "/trips", "staff", data)
        self.assertEqual(result.status_code, 201, result.json)
        return result.json["trip"]["trip_id"]

    def paid_ticket(self, trip_id):
        result = self.call("POST", "/bookings", "passenger", dict(trip_id=trip_id, seat_number=1, boarding_point="กรุงเทพฯ", alighting_point="Stop A"))
        self.assertEqual(result.status_code, 201, result.json)
        booking_id = result.json["booking"]["booking_id"]
        result = self.call("POST", f"/bookings/{booking_id}/pay", "passenger", {})
        self.assertEqual(result.status_code, 200, result.json)
        return booking_id, result.json["ticket"]["qr_code"]

    def test_empty_database_never_seeds_demo_accounts(self):
        with self.api.app.app_context():
            with self.api.db().cursor() as c:
                c.execute("TRUNCATE app_user,route,vehicle,schedule RESTART IDENTITY CASCADE")
                self.api.db().commit()
        self.api._schema_ready = False
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        self.assertEqual(self.query("SELECT count(*) n FROM app_user")[0]["n"], 0)
        self.assertEqual(self.query("SELECT count(*) n FROM trip")[0]["n"], 0)

    def test_old_default_demo_login_is_disabled_without_deleting_accounts(self):
        self.query("UPDATE app_user SET username='custom-admin' WHERE username='admin'")
        self.query("INSERT INTO app_user(first_name,last_name,username,email,password_user,role) VALUES('Demo','Admin','admin','admin@everyvan.com',%s,'admin')", (self.api.hash_password("admin"),))
        with self.api.app.app_context():
            self.api.disable_default_demo_accounts()
            self.api.db().commit()
        self.assertFalse(self.query("SELECT is_active FROM app_user WHERE username='admin'")[0]["is_active"])
        self.assertTrue(self.query("SELECT is_active FROM app_user WHERE username='custom-admin'")[0]["is_active"])

    def test_scan_commits_check_in_once_even_with_concurrent_requests(self):
        booking_id, code = self.paid_ticket(self.trip())
        def scan_once(_):
            with self.api.app.test_client() as client:
                return self.call("POST", "/scan", "driver", {"qr_code": code}, client)
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(scan_once, range(2)))
        self.assertTrue(all(r.status_code == 200 for r in results), [r.json for r in results])
        self.assertEqual(sorted(r.json["already_checked_in"] for r in results), [False, True])
        row = self.query("SELECT b.booking_status,t.ticket_status,t.scanned_at FROM booking b JOIN ticket t USING(booking_id) WHERE booking_id=%s", (booking_id,))[0]
        self.assertEqual(row["booking_status"], "boarded")
        self.assertEqual(row["ticket_status"], "boarded")
        self.assertIsNotNone(row["scanned_at"])
        repeat = self.call("POST", "/scan", "driver", {"qr_payload": {"qr_code": code}})
        self.assertTrue(repeat.json["already_checked_in"])
        self.assertEqual(self.query("SELECT scanned_at FROM ticket WHERE booking_id=%s", (booking_id,))[0]["scanned_at"], row["scanned_at"])
        self.assertEqual(self.query("SELECT count(*) n FROM audit_log WHERE action='ticket.scan_check_in'")[0]["n"], 1)

    def test_scan_rejects_wrong_driver_future_cancelled_unpaid_and_closed_tickets(self):
        booking_id, code = self.paid_ticket(self.trip())
        self.assertEqual(self.call("POST", "/scan", "other-driver", {"qr_code": code}).status_code, 403)
        self.assertEqual(self.call("POST", "/scan", "passenger", {"qr_code": code}).status_code, 403)
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": {"bad": []}}).status_code, 400)
        for status in ("cancelled", "completed", "alighted", "pending"):
            self.query("UPDATE booking SET booking_status=%s WHERE booking_id=%s", (status, booking_id))
            self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": code}).status_code, 409)
        self.query("UPDATE booking SET booking_status='paid' WHERE booking_id=%s", (booking_id,))
        self.query("UPDATE payment SET payment_status='unpaid' WHERE booking_id=%s", (booking_id,))
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": code}).status_code, 409)
        self.query("UPDATE payment SET payment_status='success' WHERE booking_id=%s", (booking_id,))
        self.query("UPDATE trip SET trip_status='completed'")
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": code}).status_code, 409)
        _, future_code = self.paid_ticket(self.trip(datetime.now(self.api.BANGKOK) + timedelta(days=1)))
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": future_code}).status_code, 409)
        self.assertIsNone(self.query("SELECT scanned_at FROM ticket WHERE booking_id=%s", (booking_id,))[0]["scanned_at"])

    def test_shared_stops_validate_route_order_before_departure(self):
        trip_id = self.trip()
        for pickup, drop_off in (("Stop A", "Stop A"), ("Stop B", "Stop A"), ("Test destination", "Stop B"), ("Unknown", "Stop A")):
            response = self.call("POST", "/bookings", "passenger", dict(trip_id=trip_id, seat_number=2, boarding_point=pickup, alighting_point=drop_off))
            self.assertEqual(response.status_code, 400, response.json)
        response = self.call("POST", "/bookings", "passenger", dict(trip_id=trip_id, seat_number=2, boarding_point="Stop A", alighting_point="Test destination"))
        self.assertEqual(response.status_code, 201, response.json)
        rows = self.call("GET", "/bookings", "passenger").json["bookings"]
        self.assertEqual(rows[0]["boarding_point"], "Stop A")
        self.assertEqual(rows[0]["alighting_point"], "Test destination")

    def test_staff_can_create_book_and_scan_a_return_trip(self):
        outbound_id = self.trip()
        data = {**self.template(), "origin": " Test destination ", "destination": " กรุงเทพฯ ",
                "drop_off_points": ["Test destination", "Stop B", "Stop A", "กรุงเทพฯ"],
                "departure_time": (datetime.now(self.api.BANGKOK) + timedelta(hours=1)).isoformat()}
        response = self.call("POST", "/trips", "staff", data)
        self.assertEqual(response.status_code, 201, response.json)
        trip_id = response.json["trip"]["trip_id"]
        trips = {int(t["id"]): t for t in self.call("GET", "/trips", "passenger").json["vans"]}
        self.assertEqual(trips[outbound_id]["origin"], "กรุงเทพฯ")
        self.assertEqual(trips[trip_id]["origin"], "Test destination")
        self.assertEqual(trips[trip_id]["destination"], "กรุงเทพฯ")
        self.assertEqual(trips[trip_id]["dropOffPoints"], ["Stop B", "Stop A", "กรุงเทพฯ"])
        booking = dict(trip_id=trip_id, seat_number=1, boarding_point="Test destination", alighting_point="กรุงเทพฯ")
        for pickup in ("กรุงเทพฯ", self.api.origin_boarding_points("กรุงเทพฯ")[1]):
            rejected = self.call("POST", "/bookings", "passenger", {**booking, "boarding_point": pickup})
            self.assertEqual(rejected.status_code, 400, rejected.json)
        response = self.call("POST", "/bookings", "passenger", booking)
        self.assertEqual(response.status_code, 201, response.json)
        booking_id = response.json["booking"]["booking_id"]
        saved = self.call("GET", "/bookings", "passenger").json["bookings"][0]
        self.assertEqual((saved["origin"], saved["destination"]), ("Test destination", "กรุงเทพฯ"))
        paid = self.call("POST", f"/bookings/{booking_id}/pay", "passenger", {})
        self.assertEqual(paid.status_code, 200, paid.json)
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": paid.json["ticket"]["qr_code"]}).status_code, 200)
        wrong_location = self.api.origin_boarding_points("กรุงเทพฯ")[1]
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": wrong_location}).status_code, 400)
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": "Stop B"}).status_code, 200)
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": "Test destination"}).status_code, 409)

    def test_route_pairs_are_distinct_and_reused_without_changing_existing_routes(self):
        original_id = self.trip()
        data = {**self.template(), "destination": "Test destination",
                "departure_time": (datetime.now(self.api.BANGKOK) + timedelta(hours=1)).isoformat()}
        for origin in ("Other origin", "Other origin", "Test destination"):
            payload = {**data, "origin": origin}
            if origin == "Test destination":
                payload["destination"] = "กรุงเทพฯ"
            self.assertEqual(self.call("POST", "/trips", "staff", payload).status_code, 201)
        self.assertEqual(self.query("SELECT count(*) n FROM route")[0]["n"], 3)
        self.assertEqual(self.query("SELECT origin FROM route JOIN trip USING(route_id) WHERE trip_id=%s", (original_id,))[0]["origin"], "กรุงเทพฯ")

    def test_route_endpoints_are_validated_for_daily_and_single_trips(self):
        for changes in ({"origin": " "}, {"origin": None}, {"origin": []}, {"origin": "x" * 151},
                        {"destination": "x" * 151}, {"origin": " Test destination "}):
            data = {**self.template(), **changes}
            response = self.call("POST", "/recurring-schedules", "staff", data)
            self.assertEqual(response.status_code, 400, response.json)
            data["departure_time"] = (datetime.now(self.api.BANGKOK) + timedelta(hours=1)).isoformat()
            response = self.call("POST", "/trips", "staff", data)
            self.assertEqual(response.status_code, 400, response.json)

    def test_recurring_return_route_changes_preserve_booked_trips(self):
        data = self.template()
        result = self.call("POST", "/recurring-schedules", "staff", data)
        self.assertEqual(result.status_code, 201, result.json)
        recurring_id = result.json["recurring_id"]
        trips = self.query("SELECT trip_id FROM trip ORDER BY service_date")
        booked_id = trips[0]["trip_id"]
        self.paid_ticket(booked_id)
        data.update(origin="Test destination", destination="กรุงเทพฯ", drop_off_points=["Stop B", "Stop A"])
        result = self.call("PUT", f"/recurring-schedules/{recurring_id}", "staff", data)
        self.assertEqual(result.status_code, 200, result.json)
        saved = self.call("GET", "/recurring-schedules", "staff").json["schedules"][0]
        self.assertEqual((saved["origin"], saved["destination"]), ("Test destination", "กรุงเทพฯ"))
        routes = self.query("SELECT trip_id,origin,destination FROM trip JOIN route USING(route_id) ORDER BY service_date")
        self.assertEqual(routes[0]["origin"], "กรุงเทพฯ")
        self.assertTrue(all((r["origin"], r["destination"]) == ("Test destination", "กรุงเทพฯ") for r in routes[1:]))
        for enabled in (False, True):
            data["enabled"] = enabled
            self.assertEqual(self.call("PUT", f"/recurring-schedules/{recurring_id}", "staff", data).status_code, 200)
        self.assertEqual(len(self.query("SELECT trip_id FROM trip")), len(trips))

    def test_mid_route_alighting_releases_seat_for_pickup_at_same_stop(self):
        trip_id = self.trip()
        booking_id, old_code = self.paid_ticket(trip_id)
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": old_code}).status_code, 200)
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/status", "driver", {"status": "departed"}).status_code, 200)
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": "Stop A"}).status_code, 200)
        booking = dict(trip_id=trip_id, seat_number=1, boarding_point="Stop A", alighting_point="Stop B")
        self.assertEqual(self.call("POST", "/bookings", "passenger", booking).status_code, 409)
        released = self.call("POST", f"/trips/{trip_id}/alight-stop", "driver", {"alighting_point": "Stop A"})
        self.assertEqual(released.json["count"], 1)
        self.assertEqual(self.query("SELECT booking_status FROM booking WHERE booking_id=%s", (booking_id,))[0]["booking_status"], "alighted")
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": old_code}).status_code, 409)
        created = self.call("POST", "/bookings", "passenger", booking)
        self.assertEqual(created.status_code, 201, created.json)
        new_booking_id = created.json["booking"]["booking_id"]
        paid = self.call("POST", f"/bookings/{new_booking_id}/pay", "passenger", {})
        self.assertEqual(paid.status_code, 200, paid.json)
        self.assertEqual(self.call("POST", "/scan", "driver", {"qr_code": paid.json["ticket"]["qr_code"]}).status_code, 200)
        # Future pickups are also bookable, rather than only the next stop.
        future = {**booking, "seat_number": 2, "boarding_point": "Stop B", "alighting_point": "Test destination"}
        self.assertEqual(self.call("POST", "/bookings", "passenger", future).status_code, 201)

    def test_passed_stops_and_backward_location_updates_are_rejected(self):
        trip_id = self.trip()
        self.call("PATCH", f"/trips/{trip_id}/status", "driver", {"status": "travelling"})
        self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": "Stop B"})
        for pickup in ("Stop A", "กรุงเทพฯ"):
            booking = dict(trip_id=trip_id, seat_number=1, boarding_point=pickup, alighting_point="Test destination")
            self.assertEqual(self.call("POST", "/bookings", "passenger", booking).status_code, 409)
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": "Stop A"}).status_code, 409)
        self.assertEqual(self.call("PATCH", f"/trips/{trip_id}/location", "driver", {"current_stop": "Unknown"}).status_code, 400)
        response = self.call("POST", "/bookings", "passenger", dict(trip_id=trip_id, seat_number=1, boarding_point="Stop B", alighting_point="Test destination"))
        self.assertEqual(response.status_code, 201, response.json)

    def test_daily_generation_is_concurrent_safe_and_rolls_over_bangkok_midnight(self):
        data = self.template()
        result = self.call("POST", "/recurring-schedules", data=data)
        self.assertEqual(result.status_code, 201, result.json)
        original = self.query("SELECT trip_id FROM trip")
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(list(pool.map(lambda _: self.generate(), range(2))), [0, 0])
        self.assertEqual(self.query("SELECT trip_id FROM trip"), original)
        tomorrow = datetime.now(self.api.BANGKOK).replace(hour=0, minute=1, second=0, microsecond=0) + timedelta(days=1)
        self.assertEqual(self.generate(tomorrow), 1)
        self.assertEqual(self.generate(tomorrow), 0)
        self.assertEqual(self.query("SELECT count(*) n FROM trip GROUP BY recurring_id,service_date HAVING count(*)>1"), [])

    def test_edit_pause_resume_preserves_bookings_and_daily_overrides(self):
        data = self.template()
        result = self.call("POST", "/recurring-schedules", data=data)
        self.assertEqual(result.status_code, 201, result.json)
        recurring_id = result.json["recurring_id"]
        trips = self.query("SELECT t.trip_id,s.departure_time FROM trip t JOIN schedule s USING(schedule_id) ORDER BY s.departure_time")
        booked_id = trips[0]["trip_id"]
        self.paid_ticket(booked_id)
        override_id = trips[1]["trip_id"]
        custom_time = (trips[1]["departure_time"] - timedelta(minutes=20)).isoformat()
        result = self.call("PATCH", f"/trips/{override_id}/time", data={"departure_time": custom_time})
        self.assertEqual(result.status_code, 200, result.json)
        data.update(departure_time="22:30", price=300)
        self.assertEqual(self.call("PUT", f"/recurring-schedules/{recurring_id}", data=data).status_code, 200)
        self.assertEqual(self.query("SELECT fare FROM trip WHERE trip_id=%s", (booked_id,))[0]["fare"], 220)
        self.assertEqual(self.query("SELECT s.departure_time FROM schedule s JOIN trip t USING(schedule_id) WHERE trip_id=%s", (override_id,))[0]["departure_time"].isoformat(), custom_time)
        editable_id = trips[2]["trip_id"]
        self.assertEqual(self.query("SELECT fare FROM trip WHERE trip_id=%s", (editable_id,))[0]["fare"], 300)
        data["enabled"] = False
        self.assertEqual(self.call("PUT", f"/recurring-schedules/{recurring_id}", data=data).status_code, 200)
        for trip_id, active in ((booked_id, True), (override_id, True), (editable_id, False)):
            self.assertEqual(self.query("SELECT active_status FROM schedule JOIN trip USING(schedule_id) WHERE trip_id=%s", (trip_id,))[0]["active_status"], active)
        data["enabled"] = True
        self.assertEqual(self.call("PUT", f"/recurring-schedules/{recurring_id}", data=data).status_code, 200)
        self.assertEqual(len(self.query("SELECT trip_id FROM trip")), len(trips))
        self.assertTrue(self.query("SELECT active_status FROM schedule JOIN trip USING(schedule_id) WHERE trip_id=%s", (editable_id,))[0]["active_status"])

    def test_templates_validate_roles_dates_money_and_duplicates(self):
        data = self.template()
        for role in ("driver", "passenger", "accountant"):
            self.assertEqual(self.call("POST", "/recurring-schedules", role, data).status_code, 403)
        for changes in ({"price": "NaN"}, {"price": -1}, {"start_date": "bad"}, {"departure_time": "bad"}, {"drop_off_points": []}, {"driver_id": 99999}, {"total_seats": 100}, {"duration_minutes": 0}):
            self.assertEqual(self.call("POST", "/recurring-schedules", data={**data, **changes}).status_code, 400, changes)
        self.assertEqual(self.call("POST", "/recurring-schedules", data=data).status_code, 201)
        self.assertEqual(self.call("POST", "/recurring-schedules", data=data).status_code, 409)
        self.assertEqual(self.call("PUT", "/recurring-schedules/99999", data=data).status_code, 404)
        self.assertEqual(self.call("GET", "/recurring-schedules").json["schedules"][0]["departure_time"], "23:59")


if __name__ == "__main__":
    unittest.main()
