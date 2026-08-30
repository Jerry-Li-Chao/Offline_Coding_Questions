"""SQLite persistence: draft code, notes, custom test cases, submissions."""

import json
import os
import sqlite3
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "app.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS problem_state (
    slug        TEXT PRIMARY KEY,
    lang        TEXT NOT NULL DEFAULT 'python',
    code        TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    testcases   TEXT NOT NULL DEFAULT '',
    starred     INTEGER NOT NULL DEFAULT 0,
    updated_at  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL,
    lang        TEXT NOT NULL DEFAULT 'python',
    code        TEXT NOT NULL,
    status      TEXT NOT NULL,
    label       TEXT NOT NULL,
    passed      INTEGER NOT NULL,
    total       INTEGER NOT NULL,
    runtime_ms  REAL NOT NULL DEFAULT 0,
    detail      TEXT NOT NULL DEFAULT '{}',
    created_at  REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_slug ON submissions (slug, created_at DESC);
"""


_schema_ready = False


def connect():
    """Open the database, creating the schema if it isn't there yet.

    Checking on every first-use (and whenever the file has gone missing) means
    deleting data/app.db to reset your progress just works, even mid-session.
    """
    global _schema_ready
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    missing = not os.path.exists(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if missing or not _schema_ready:
        conn.executescript(SCHEMA)
        conn.commit()
        _schema_ready = True
    return conn


def init_db():
    connect().close()


def _ensure_row(conn, slug):
    conn.execute(
        "INSERT OR IGNORE INTO problem_state (slug, updated_at) VALUES (?, ?)",
        (slug, time.time()),
    )


def get_state(slug):
    with connect() as conn:
        _ensure_row(conn, slug)
        row = conn.execute(
            "SELECT * FROM problem_state WHERE slug = ?", (slug,)
        ).fetchone()
        state = dict(row)
    state["testcases"] = json.loads(state["testcases"]) if state["testcases"] else None
    state["starred"] = bool(state["starred"])
    state["status"] = get_status(slug)
    return state


def save_state(slug, **fields):
    allowed = {"lang", "code", "notes", "starred"}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if "testcases" in fields and fields["testcases"] is not None:
        updates["testcases"] = json.dumps(fields["testcases"])
    if "starred" in updates:
        updates["starred"] = int(bool(updates["starred"]))
    if not updates:
        return
    updates["updated_at"] = time.time()
    assignments = ", ".join("%s = ?" % k for k in updates)
    with connect() as conn:
        _ensure_row(conn, slug)
        conn.execute(
            "UPDATE problem_state SET %s WHERE slug = ?" % assignments,
            list(updates.values()) + [slug],
        )


def get_status(slug):
    """'solved' once anything was accepted, else 'attempted', else 'todo'."""
    with connect() as conn:
        row = conn.execute(
            "SELECT"
            "  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS ok,"
            "  COUNT(*) AS n"
            " FROM submissions WHERE slug = ?",
            (slug,),
        ).fetchone()
    if row["ok"]:
        return "solved"
    return "attempted" if row["n"] else "todo"


def all_statuses():
    with connect() as conn:
        rows = conn.execute(
            "SELECT slug,"
            "  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS ok,"
            "  COUNT(*) AS n"
            " FROM submissions GROUP BY slug"
        ).fetchall()
    return {
        r["slug"]: ("solved" if r["ok"] else "attempted")
        for r in rows
    }


def add_submission(slug, lang, code, verdict):
    detail = {
        "results": verdict.get("results", []),
        "error": verdict.get("error"),
        "timeout_sec": verdict.get("timeout_sec"),
    }
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO submissions"
            " (slug, lang, code, status, label, passed, total, runtime_ms, detail, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                slug,
                lang,
                code,
                verdict.get("status", "internal_error"),
                verdict.get("label", "Unknown"),
                verdict.get("passed", 0),
                verdict.get("total", 0),
                verdict.get("runtime_ms", 0),
                json.dumps(detail),
                time.time(),
            ),
        )
        return cur.lastrowid


def list_submissions(slug, limit=100):
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, slug, lang, status, label, passed, total, runtime_ms, created_at"
            " FROM submissions WHERE slug = ? ORDER BY created_at DESC LIMIT ?",
            (slug, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_submission(sub_id):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (sub_id,)
        ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["detail"] = json.loads(item["detail"])
    return item


def delete_submission(sub_id):
    with connect() as conn:
        conn.execute("DELETE FROM submissions WHERE id = ?", (sub_id,))


def stats():
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS total,"
            "  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted"
            " FROM submissions"
        ).fetchone()
    return {"submissions": row["total"] or 0, "accepted": row["accepted"] or 0}
