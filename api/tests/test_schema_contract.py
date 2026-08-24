import unittest
from pathlib import Path


class SchemaContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = (
            Path(__file__).resolve().parents[1] / "ticket_schema.sql"
        ).read_text(encoding="utf-8").lower()

    def test_prevents_double_booking(self):
        self.assertIn("uq_active_trip_seat", self.schema)
        self.assertIn(
            "where booking_status not in ('cancelled','completed','alighted')",
            self.schema,
        )

    def test_sessions_expire_and_reviews_are_unique_per_booking(self):
        self.assertIn("create table if not exists auth_session", self.schema)
        self.assertIn("expires_at timestamptz", self.schema)
        self.assertIn("uq_driver_review_booking", self.schema)

    def test_accounts_can_be_disabled_and_filtered_by_role(self):
        self.assertIn(
            "is_active boolean not null default true",
            self.schema,
        )
        self.assertIn("idx_app_user_role_active", self.schema)


if __name__ == "__main__":
    unittest.main()
