"""Keeps the test run's log out of the repo's logs/ folder."""

import os
import tempfile

os.environ.setdefault("LOG_FILE", os.path.join(tempfile.mkdtemp(prefix="aegis-test-log-"), "aegis.log"))
