import os
import unittest
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/revaudit-test-suite.db")
os.environ.setdefault("SESSION_SECRET", "test-secret")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

REDIRECT = "https://iomendeapkpepmlapflpdjnogjapccff.chromiumapp.org/"


class ExtensionOAuthTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_missing_config_returns_503(self):
        with patch.dict(
            os.environ, {"GITHUB_CLIENT_ID": "", "GITHUB_CLIENT_SECRET": ""}
        ):
            response = self.client.post(
                "/api/github/oauth/exchange",
                json={"code": "abc", "redirect_uri": REDIRECT},
            )
        self.assertEqual(response.status_code, 503)

    def test_invalid_redirect_is_rejected(self):
        with patch.dict(
            os.environ,
            {"GITHUB_CLIENT_ID": "client", "GITHUB_CLIENT_SECRET": "secret"},
        ):
            response = self.client.post(
                "/api/github/oauth/exchange",
                json={"code": "abc", "redirect_uri": "https://evil.example/"},
            )
        self.assertEqual(response.status_code, 400)

    def test_missing_code_is_rejected(self):
        with patch.dict(
            os.environ,
            {"GITHUB_CLIENT_ID": "client", "GITHUB_CLIENT_SECRET": "secret"},
        ):
            response = self.client.post(
                "/api/github/oauth/exchange",
                json={"code": "", "redirect_uri": REDIRECT},
            )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
