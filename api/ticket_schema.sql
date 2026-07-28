CREATE TABLE IF NOT EXISTS app_user (
  user_id SERIAL PRIMARY KEY, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
  username VARCHAR(100) UNIQUE, birthdate DATE, phone VARCHAR(20), email VARCHAR(150) NOT NULL UNIQUE,
  password_user VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL CHECK (role IN ('staff','passenger','driver','accountant','dispatcher','admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, create_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_session (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours')
);
CREATE TABLE IF NOT EXISTS staff (staff_id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE, department VARCHAR(100), id_card VARCHAR(30) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS passenger (passenger_id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE);
ALTER TABLE passenger ADD COLUMN IF NOT EXISTS id_card VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS uq_passenger_id_card ON passenger(id_card) WHERE id_card IS NOT NULL AND id_card <> '';
CREATE TABLE IF NOT EXISTS driver (driver_id SERIAL PRIMARY KEY, user_id INT UNIQUE REFERENCES app_user(user_id) ON DELETE SET NULL, name VARCHAR(150) NOT NULL, license_id VARCHAR(30) NOT NULL UNIQUE, phone VARCHAR(20), photo TEXT, rating NUMERIC(2,1) DEFAULT 5.0);
CREATE TABLE IF NOT EXISTS route (route_id SERIAL PRIMARY KEY, origin VARCHAR(150) NOT NULL, destination VARCHAR(150) NOT NULL, UNIQUE(origin,destination));
CREATE TABLE IF NOT EXISTS vehicle (vehicle_id SERIAL PRIMARY KEY, vehicle_type VARCHAR(50), status VARCHAR(30) NOT NULL DEFAULT 'waiting', license_plate VARCHAR(20) NOT NULL UNIQUE, total_seats SMALLINT NOT NULL CHECK(total_seats > 0));
CREATE TABLE IF NOT EXISTS seat (vehicle_id INT NOT NULL REFERENCES vehicle(vehicle_id) ON DELETE CASCADE, seat_number VARCHAR(10) NOT NULL, seat_status VARCHAR(20) NOT NULL DEFAULT 'available', PRIMARY KEY(vehicle_id,seat_number));
CREATE TABLE IF NOT EXISTS schedule (schedule_id SERIAL PRIMARY KEY, departure_time TIMESTAMPTZ NOT NULL, arrive_time TIMESTAMPTZ, active_status BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS trip (trip_id SERIAL PRIMARY KEY, route_id INT NOT NULL REFERENCES route(route_id), driver_id INT NOT NULL REFERENCES driver(driver_id), vehicle_id INT NOT NULL REFERENCES vehicle(vehicle_id), schedule_id INT NOT NULL UNIQUE REFERENCES schedule(schedule_id), real_arrival_time TIMESTAMPTZ, real_departure_time TIMESTAMPTZ, total_passengers SMALLINT NOT NULL DEFAULT 0, trip_status VARCHAR(30) NOT NULL DEFAULT 'waiting');
ALTER TABLE trip ADD COLUMN IF NOT EXISTS fare NUMERIC(10,2) NOT NULL DEFAULT 220 CHECK(fare >= 0);
CREATE TABLE IF NOT EXISTS booking (booking_id SERIAL PRIMARY KEY, passenger_id INT NOT NULL REFERENCES passenger(passenger_id), trip_id INT NOT NULL REFERENCES trip(trip_id), schedule_id INT NOT NULL REFERENCES schedule(schedule_id), seat_number VARCHAR(10) NOT NULL, boarding_point VARCHAR(150), booking_status VARCHAR(30) NOT NULL DEFAULT 'pending', booking_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '5 minutes'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_trip_seat ON booking(trip_id,seat_number) WHERE booking_status NOT IN ('cancelled','completed');
CREATE TABLE IF NOT EXISTS ticket (ticket_id SERIAL PRIMARY KEY, booking_id INT NOT NULL UNIQUE REFERENCES booking(booking_id) ON DELETE CASCADE, qr_code VARCHAR(255) NOT NULL UNIQUE, scanned_at TIMESTAMPTZ, ticket_status VARCHAR(30) NOT NULL DEFAULT 'issued');
CREATE TABLE IF NOT EXISTS payment (payment_id SERIAL PRIMARY KEY, booking_id INT NOT NULL UNIQUE REFERENCES booking(booking_id) ON DELETE CASCADE, method VARCHAR(30), payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid', amount NUMERIC(10,2) NOT NULL CHECK(amount>=0), receipt_no VARCHAR(50) UNIQUE, payment_datetime TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS audit_log (audit_id BIGSERIAL PRIMARY KEY, user_id INT REFERENCES app_user(user_id), action VARCHAR(80) NOT NULL, entity VARCHAR(40), entity_id VARCHAR(50), payload JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS notification (notification_id BIGSERIAL PRIMARY KEY, user_id INT REFERENCES app_user(user_id) ON DELETE CASCADE, message TEXT NOT NULL, notification_type VARCHAR(40) NOT NULL DEFAULT 'system', is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS driver_review (
  review_id BIGSERIAL PRIMARY KEY,
  driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
  passenger_id INT NOT NULL REFERENCES passenger(passenger_id) ON DELETE CASCADE,
  booking_id INT REFERENCES booking(booking_id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE driver_review ADD COLUMN IF NOT EXISTS booking_id INT REFERENCES booking(booking_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_driver_review_booking ON driver_review(booking_id) WHERE booking_id IS NOT NULL;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS user_id INT UNIQUE REFERENCES app_user(user_id) ON DELETE SET NULL;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_trip_schedule ON trip(schedule_id); CREATE INDEX IF NOT EXISTS idx_booking_passenger ON booking(passenger_id); CREATE INDEX IF NOT EXISTS idx_booking_trip ON booking(trip_id); CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(payment_status);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_session_user ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_expiry ON auth_session(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_user_role_active ON app_user(role, is_active);
