"""Synthetic boundary tests; no original private documents are stored here."""
import hashlib
import importlib.util
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "public_content", Path(__file__).resolve().parents[1] / "scripts/check-public-content.py"
)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class PublicContentBoundaryTests(unittest.TestCase):
    def test_removed_path_and_aliases_are_rejected(self):
        for path in ("grace-together/index.html", "backup/GraceTogether.html", "docs/grace_together.md"):
            with self.subTest(path=path):
                self.assertIn("private path", guard.violations(path, b"placeholder"))

    def test_private_backups_are_rejected(self):
        self.assertIn("private path", guard.violations(".private/export.zip", b"archive"))

    def test_links_and_renamed_text_are_rejected(self):
        for text in (b'<a href="/grace-together/demo/">review</a>', b"GraceTogether", "건강동행".encode()):
            with self.subTest(text=text):
                self.assertIn("private project content or reference", guard.violations("notes.html", text))

    def test_renamed_binary_is_rejected_by_fingerprint(self):
        data = b"synthetic private asset"
        with patch.object(guard, "PRIVATE_HASHES", {hashlib.sha256(data).hexdigest()}):
            self.assertIn("removed private file fingerprint", guard.violations("assets/renamed.bin", data))

    def test_center_portfolio_and_booking_are_allowed(self):
        for path, data in (("assets/grace-site.webp", b"public center portfolio image"),
                           ("index.html", b'<a href="https://cal.com/alexsoft-hq/consultation">Book</a>')):
            with self.subTest(path=path):
                self.assertEqual([], guard.violations(path, data))

    def test_fingerprints_cover_all_removed_files(self):
        self.assertEqual(28, len(guard.PRIVATE_HASHES))
        self.assertTrue(all(len(value) == 64 for value in guard.PRIVATE_HASHES))

    def test_broken_symlink_blocks_publication(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "broken-link").symlink_to("missing-target")
            with patch.object(guard, "ROOT", root), patch.object(
                guard.subprocess, "check_output", return_value=b"broken-link\0"
            ), redirect_stdout(StringIO()):
                self.assertEqual(1, guard.main())


if __name__ == "__main__":
    unittest.main()
