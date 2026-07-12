"""SQLite data layer for the GreenField backend.

Keeps schema, connection handling and seed data in one place so the Flask
app (app.py) only deals with HTTP concerns. Currently covers the Raise Ticket
module; new modules (OKR, Supplier Eval, ...) can add their own tables here.
"""

import json
import os
import sqlite3

DB_PATH = os.environ.get(
    "GREENFIELD_DB",
    os.path.join(os.path.dirname(__file__), "greenfield.db"),
)

# ── Seed data (mirrors DEFAULT_STAFF / DEFAULT_POINTS in RaiseTicket.jsx) ──────
DEFAULT_STAFF = [
    {"id": "GD01", "name": "Nguyễn Văn A", "level": "GD", "bu": "BU1", "reportsTo": None},
    {"id": "TPCC01", "name": "Trần Thị B", "level": "TPCC", "bu": "BU1", "reportsTo": "GD01"},
    {"id": "TPCC02", "name": "Lê Văn C", "level": "TPCC", "bu": "BU2", "reportsTo": "GD01"},
    {"id": "TP01", "name": "Phạm Thị D", "level": "TP", "bu": "BU1", "reportsTo": "TPCC01"},
    {"id": "TP02", "name": "Hoàng Văn E", "level": "TP", "bu": "BU2", "reportsTo": "TPCC02"},
    {"id": "NV01", "name": "Ngô Thị F", "level": "NV", "bu": "BU1", "reportsTo": "TP01"},
    {"id": "NV02", "name": "Đỗ Văn G", "level": "NV", "bu": "BU1", "reportsTo": "TP01"},
    {"id": "NV03", "name": "Vũ Thị H", "level": "NV", "bu": "BU2", "reportsTo": "TP02"},
]

DEFAULT_POINTS = {
    "raise": {"NV": 10, "TP": 1, "TPCC": 0.5, "GD_subordinate": 0.1, "GD_self": 20},
    "announce": {"GD": 5, "TPCC": 1},
    "feedback": {"GD": 4, "TPCC": 3, "TP": 2, "NV": 1},
    "useful": {"raiser": 100, "announcer": 15, "responder": 10},
    "timePerPoint": 2,
}

DEFAULT_EMAILS = [""]


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables if missing and seed defaults on first run."""
    conn = get_conn()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS staff (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                level      TEXT NOT NULL,
                bu         TEXT NOT NULL,
                reports_to TEXT
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id            TEXT PRIMARY KEY,
                code          TEXT NOT NULL,
                type          TEXT NOT NULL,
                bu            TEXT NOT NULL,
                raiser_id     TEXT,
                raiser_name   TEXT,
                raiser_level  TEXT,
                what          TEXT,
                why           TEXT,
                where_        TEXT,
                when_         TEXT,
                how           TEXT,
                note          TEXT,
                date          TEXT NOT NULL,
                useful        INTEGER NOT NULL DEFAULT 0,
                custom_points REAL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )

        # Seed staff (only when empty so restarts don't clobber edits).
        if conn.execute("SELECT COUNT(*) FROM staff").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO staff (id, name, level, bu, reports_to) "
                "VALUES (:id, :name, :level, :bu, :reportsTo)",
                DEFAULT_STAFF,
            )

        # Seed settings.
        _seed_setting(conn, "points", DEFAULT_POINTS)
        _seed_setting(conn, "emails", DEFAULT_EMAILS)

        conn.commit()
    finally:
        conn.close()


def _seed_setting(conn, key, value):
    row = conn.execute("SELECT 1 FROM settings WHERE key = ?", (key,)).fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?)",
            (key, json.dumps(value)),
        )


# ── Row <-> dict mappers ──────────────────────────────────────────────────────
def staff_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "level": row["level"],
        "bu": row["bu"],
        "reportsTo": row["reports_to"],
    }


def ticket_to_dict(row):
    return {
        "id": row["id"],
        "code": row["code"],
        "type": row["type"],
        "bu": row["bu"],
        "raiserId": row["raiser_id"],
        "raiserName": row["raiser_name"],
        "raiserLevel": row["raiser_level"],
        "what": row["what"],
        "why": row["why"],
        "where": row["where_"],
        "when": row["when_"],
        "how": row["how"],
        "note": row["note"],
        "date": row["date"],
        "useful": bool(row["useful"]),
        "customPoints": row["custom_points"],
    }


def get_setting(conn, key, fallback=None):
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return json.loads(row["value"]) if row else fallback


def set_setting(conn, key, value):
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, json.dumps(value)),
    )
