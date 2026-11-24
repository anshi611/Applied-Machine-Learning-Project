"""Point the app at a temporary database BEFORE it is imported, so tests never touch mydel.db."""
import os
import tempfile

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
