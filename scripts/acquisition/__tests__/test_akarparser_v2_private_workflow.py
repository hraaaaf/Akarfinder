"""Structural guard for private self-hosted-only Actions workflow."""
from __future__ import annotations

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = ROOT / '.github' / 'workflows' / 'akarparser-v2-private-windows-lake.yml'


class PrivateWorkflowContractTests(unittest.TestCase):
    def test_manual_main_only_trusted_runner(self):
        text = WORKFLOW.read_text(encoding='utf-8')
        self.assertIn('workflow_dispatch:', text)
        self.assertNotIn('  pull_request:', text)
        self.assertNotIn('  push:', text)
        self.assertIn("github.ref == 'refs/heads/main'", text)
        self.assertIn('runs-on: [self-hosted, windows, akarfinder-private-lake]', text)
        self.assertIn('environment: q1e-private-local', text)

    def test_canary_only_separates_archive_gate(self):
        text = WORKFLOW.read_text(encoding='utf-8')
        self.assertIn('- canary_only', text)
        self.assertIn('- archive_then_canary', text)
        self.assertIn('--verify-only', text)
        self.assertIn("if: inputs.operation == 'archive_then_canary'", text)
        self.assertIn('--sample-size 1000 --audit-size 100', text)
        self.assertIn("if ('${{ inputs.operation }}' -eq 'archive_then_canary')", text)

    def test_does_not_export_raw_rows_or_use_cloud_database(self):
        text = WORKFLOW.read_text(encoding='utf-8')
        for forbidden in ['actions/upload-artifact', 'NEON_DATABASE_URL',
                          'NEON_RECOVERY_DATABASE_URL', 'DATABASE_URL:',
                          'aws-actions/', 'actions/cache@']:
            self.assertNotIn(forbidden, text)
        self.assertIn('akarparser_v2_private_archive.py', text)
        self.assertIn('akarparser_v2_canary.py', text)
        self.assertIn('--sample-size 1000 --audit-size 100', text)


if __name__ == '__main__':
    unittest.main()
