"""Run with python -m api.maintenance; does not depend on visitors opening the web."""
import logging
import time
from .app import app, db, initialize_schema, cleanup_expired, create_departure_notifications
from .recurring import generate_daily_trips


def run_once():
    with app.app_context():
        initialize_schema()
        created = generate_daily_trips(db())
        db().commit()
        cleanup_expired()
        create_departure_notifications()
        return created


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            logging.info("Daily queue: %s trips created", run_once())
        except Exception:
            logging.exception("Daily queue failed; retrying in 30 seconds")
        time.sleep(30)
