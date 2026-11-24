"""
SQLite database: stores what the retention team DOES with the model's advice.

The ML results (scores, metrics) are read-only files. This database holds the
data users create while using the app:
  contacts     every time an agent contacts a customer (channel, outcome, note)
  predictions  every customer checked on the "Check a customer" page

SQLite is a single file (backend/data/mydel.db), built into Python, no server
needed. Swapping to PostgreSQL later would only change this file.
"""
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("DB_PATH", REPO_ROOT / "backend" / "data" / "mydel.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS contacts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id  TEXT NOT NULL,
    channel      TEXT NOT NULL,          -- Phone call / Email / SMS / In store
    action       TEXT NOT NULL,          -- what was offered
    outcome      TEXT NOT NULL,          -- Pending / Accepted offer / Declined / ...
    note         TEXT NOT NULL DEFAULT '',
    agent        TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id);

CREATE TABLE IF NOT EXISTS predictions (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    input_json         TEXT NOT NULL,     -- the customer details that were scored
    churn_probability  REAL NOT NULL,
    uplift_score       REAL NOT NULL,
    risk_level         TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    created_at         TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Database:
    def __init__(self, path: Path = DB_PATH) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as con:
            con.executescript(SCHEMA)

    def _conn(self) -> sqlite3.Connection:
        # A new short-lived connection per call keeps this safe with FastAPI's thread pool.
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def _query(self, sql: str, args: tuple = ()) -> list[dict]:
        with self._conn() as con:
            return [dict(r) for r in con.execute(sql, args).fetchall()]

    # ---------- contacts ----------
    def add_contact(self, customer_id: str, data: dict) -> dict:
        with self._conn() as con:
            cur = con.execute(
                "INSERT INTO contacts (customer_id, channel, action, outcome, note, agent, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (customer_id, data["channel"], data["action"], data["outcome"],
                 data.get("note", ""), data.get("agent", ""), _now()),
            )
            new_id = cur.lastrowid
        return self.get_contact(new_id)

    def get_contact(self, contact_id: int):
        rows = self._query("SELECT * FROM contacts WHERE id = ?", (contact_id,))
        return rows[0] if rows else None

    def update_contact(self, contact_id: int, changes: dict):
        changes = {k: v for k, v in changes.items() if v is not None}
        if changes:
            cols = ", ".join(f"{k} = ?" for k in changes)  # keys come from the Pydantic schema only
            with self._conn() as con:
                con.execute(f"UPDATE contacts SET {cols} WHERE id = ?", (*changes.values(), contact_id))
        return self.get_contact(contact_id)

    def delete_contact(self, contact_id: int) -> bool:
        with self._conn() as con:
            return con.execute("DELETE FROM contacts WHERE id = ?", (contact_id,)).rowcount > 0

    def contacts_for(self, customer_id: str) -> list[dict]:
        return self._query(
            "SELECT * FROM contacts WHERE customer_id = ? ORDER BY id DESC", (customer_id,))

    def recent_contacts(self, limit: int = 50, outcome: str | None = None) -> list[dict]:
        if outcome:
            return self._query("SELECT * FROM contacts WHERE outcome = ? ORDER BY id DESC LIMIT ?",
                               (outcome, limit))
        return self._query("SELECT * FROM contacts ORDER BY id DESC LIMIT ?", (limit,))

    def contact_stats(self) -> dict:
        by_outcome = self._query("SELECT outcome, COUNT(*) AS n FROM contacts GROUP BY outcome")
        by_channel = self._query("SELECT channel, COUNT(*) AS n FROM contacts GROUP BY channel")
        total = sum(r["n"] for r in by_outcome)
        customers = self._query("SELECT COUNT(DISTINCT customer_id) AS n FROM contacts")[0]["n"]
        accepted = next((r["n"] for r in by_outcome if r["outcome"] == "Accepted offer"), 0)
        return {
            "total_contacts": total,
            "customers_contacted": customers,
            "acceptance_rate": round(accepted / total, 4) if total else None,
            "by_outcome": {r["outcome"]: r["n"] for r in by_outcome},
            "by_channel": {r["channel"]: r["n"] for r in by_channel},
        }

    # ---------- prediction history ----------
    def log_prediction(self, features: dict, result: dict) -> None:
        with self._conn() as con:
            con.execute(
                "INSERT INTO predictions (input_json, churn_probability, uplift_score, risk_level, "
                "recommended_action, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (json.dumps(features), result["churn_probability"], result["uplift_score"],
                 result["risk_level"], result["recommended_action"], _now()),
            )

    def prediction_history(self, limit: int = 50) -> list[dict]:
        rows = self._query("SELECT * FROM predictions ORDER BY id DESC LIMIT ?", (limit,))
        for r in rows:
            r["input"] = json.loads(r.pop("input_json"))
        return rows
