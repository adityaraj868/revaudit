import os
import unittest
from unittest.mock import patch, MagicMock

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/revaudit-test-suite.db")
os.environ.setdefault("SESSION_SECRET", "test-secret")

from fastapi.testclient import TestClient
import main
from main import app, get_bearer_token


class Phase1AuthTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_bearer_token_extractor(self):
        self.assertEqual(get_bearer_token("Bearer token123"), "token123")
        self.assertEqual(get_bearer_token("bearer lowercase_token"), "lowercase_token")
        self.assertEqual(get_bearer_token("Bearer   padded_token  "), "padded_token")
        self.assertIsNone(get_bearer_token(None))
        self.assertIsNone(get_bearer_token(""))
        self.assertIsNone(get_bearer_token("Basic dXNlcjpwYXNz"))
        self.assertIsNone(get_bearer_token("Bearer "))

    @patch("main._audit")
    @patch("main.GitHubClient")
    def test_audit_endpoint_passes_bearer_token_to_github_client(self, mock_client_cls, mock_audit):
        mock_audit.return_value = {
            "metadata": {"partial": False, "github_authenticated": True},
            "anomalies": [],
        }
        mock_instance = MagicMock()
        mock_instance.authenticated = True
        mock_client_cls.return_value = mock_instance

        # Request with Bearer token
        response = self.client.get(
            "/api/audit?owner=testorg&repo=testrepo&limit=50",
            headers={"Authorization": "Bearer gh_provider_token_xyz"}
        )
        self.assertEqual(response.status_code, 200)
        # Verify GitHubClient was initialized with the bearer token from the header
        mock_client_cls.assert_called_with("gh_provider_token_xyz")

    @patch("main._audit")
    @patch("main.GitHubClient")
    def test_audit_endpoint_without_bearer_token_uses_none_or_env(self, mock_client_cls, mock_audit):
        mock_audit.return_value = {
            "metadata": {"partial": False, "github_authenticated": False},
            "anomalies": [],
        }
        mock_instance = MagicMock()
        mock_instance.authenticated = False
        mock_client_cls.return_value = mock_instance

        # Unauthenticated request without Authorization header
        response = self.client.get(
            "/api/audit?owner=testorg&repo=testrepo&limit=50"
        )
        self.assertEqual(response.status_code, 200)
        # Verify GitHubClient received env GITHUB_TOKEN or None
        mock_client_cls.assert_called_with(os.getenv("GITHUB_TOKEN"))

    def test_auth_me_unauthenticated(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["authenticated"])
        self.assertIsNone(data["user"])

    @patch("requests.get")
    def test_auth_me_with_bearer_token(self, mock_requests_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": 123456,
            "login": "octocat",
            "avatar_url": "https://github.com/images/error/octocat_happy.gif",
        }
        mock_requests_get.return_value = mock_response

        response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer gho_test_token_123"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["authenticated"])
        self.assertEqual(data["user"]["login"], "octocat")
        self.assertEqual(data["user"]["github_id"], 123456)


if __name__ == "__main__":
    unittest.main()
