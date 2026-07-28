import base64
import hashlib
import sys
import unittest
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from security import check_password, hash_password, hash_token, new_session_token


class SecurityTests(unittest.TestCase):
    def test_password_round_trip_and_wrong_password(self):
        stored = hash_password("secret-pass")
        self.assertTrue(check_password("secret-pass", stored))
        self.assertFalse(check_password("wrong", stored))

    def test_legacy_password_hash_remains_usable(self):
        salt = b"0123456789abcdef"
        digest = hashlib.pbkdf2_hmac("sha256", b"legacy", salt, 180_000)
        stored = base64.b64encode(salt + digest).decode("ascii")
        self.assertTrue(check_password("legacy", stored))

    def test_session_tokens_are_hashed_before_storage(self):
        token = new_session_token()
        self.assertNotEqual(token, hash_token(token))
        self.assertEqual(len(hash_token(token)), 64)


if __name__ == "__main__":
    unittest.main()

