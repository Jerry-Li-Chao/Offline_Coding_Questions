"""Snapshots of the practice database.

Your notes and submission history live in one SQLite file, and that file is the
only copy. This module keeps timestamped snapshots of it so a mistake — a bad
edit, a stray `rm`, a corrupted write — costs minutes instead of months.

Design notes:

* Snapshots live in ``backups/`` at the **repository root**, deliberately NOT
  inside ``data/``. Deleting or resetting the data directory must not take the
  backups with it.
* Copies are made with sqlite3's own backup API, which is safe while the server
  is reading and writing the database. A plain file copy of a live SQLite file
  can capture a torn page.
* Restoring always snapshots the current state first, so restore is itself
  undoable.
"""

import hashlib
import json
import os
import shutil
import sqlite3
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Mirrors OCQ_DB: point a test at a scratch database and its snapshots follow,
# so nothing a test does can reach the real backups either.
BACKUP_DIR = os.environ.get("OCQ_BACKUPS") or os.path.join(ROOT, "backups")
EXPORT_DIR = os.path.join(BACKUP_DIR, "notes")

# How many of each automatic kind to keep. Manual snapshots are never pruned —
# the user asked for those by name.
RETENTION = {"auto": 30, "safety": 30}

KINDS = ("auto", "manual", "safety")


def _db_path():
    from engine import store  # imported lazily to keep this module standalone
    return store.DB_PATH


def _slug(text):
    keep = [c if (c.isalnum() or c in "-_") else "-" for c in (text or "")]
    return "".join(keep).strip("-")[:40]


def _meta_path(db_file):
    return db_file[:-3] + ".json"


def _fingerprint(path):
    """Content hash, used to skip automatic snapshots that change nothing."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def summarize(path):
    """Counts worth showing in a listing, so a snapshot is recognizable."""
    try:
        conn = sqlite3.connect("file:%s?mode=ro" % path, uri=True)
        conn.row_factory = sqlite3.Row
        notes = conn.execute(
            "SELECT COUNT(*) FROM problem_state WHERE length(trim(notes)) > 0"
        ).fetchone()[0]
        drafts = conn.execute(
            "SELECT COUNT(*) FROM problem_state WHERE length(trim(code)) > 0"
        ).fetchone()[0]
        subs = conn.execute("SELECT COUNT(*) FROM submissions").fetchone()[0]
        solved = conn.execute(
            "SELECT COUNT(DISTINCT slug) FROM submissions WHERE status = 'accepted'"
        ).fetchone()[0]
        conn.close()
        return {"notes": notes, "drafts": drafts,
                "submissions": subs, "solved": solved}
    except Exception:
        return {"notes": 0, "drafts": 0, "submissions": 0, "solved": 0}


def create(label=None, kind="manual", skip_if_unchanged=False):
    """Write a snapshot. Returns its metadata, or None if it was skipped."""
    if kind not in KINDS:
        raise ValueError("unknown snapshot kind: %s" % kind)

    source = _db_path()
    if not os.path.exists(source):
        return None

    os.makedirs(BACKUP_DIR, exist_ok=True)
    fingerprint = _fingerprint(source)

    if skip_if_unchanged:
        existing = listing()
        if existing and existing[0].get("fingerprint") == fingerprint:
            return None

    stamp = time.strftime("%Y%m%d-%H%M%S")
    name = "%s-%s" % (stamp, kind)
    if label:
        tag = _slug(label)
        if tag:
            name += "-" + tag
    target = os.path.join(BACKUP_DIR, name + ".db")

    # sqlite's own backup API: consistent even while the server is writing.
    src = sqlite3.connect(source)
    dst = sqlite3.connect(target)
    with dst:
        src.backup(dst)
    dst.close()
    src.close()

    meta = {
        "name": name,
        "kind": kind,
        "label": label or "",
        "created_at": time.time(),
        "bytes": os.path.getsize(target),
        "fingerprint": fingerprint,
        "counts": summarize(target),
    }
    with open(_meta_path(target), "w") as f:
        json.dump(meta, f, indent=2)

    prune(kind)
    return meta


def listing():
    """All snapshots, newest first."""
    if not os.path.isdir(BACKUP_DIR):
        return []

    items = []
    for filename in os.listdir(BACKUP_DIR):
        if not filename.endswith(".db"):
            continue
        path = os.path.join(BACKUP_DIR, filename)
        meta = {}
        try:
            with open(_meta_path(path)) as f:
                meta = json.load(f)
        except (OSError, ValueError):
            pass  # a snapshot without its sidecar is still restorable

        meta.setdefault("name", filename[:-3])
        meta.setdefault("kind", "manual")
        meta.setdefault("label", "")
        meta.setdefault("created_at", os.path.getmtime(path))
        meta.setdefault("bytes", os.path.getsize(path))
        meta.setdefault("counts", summarize(path))
        items.append(meta)

    items.sort(key=lambda m: m["created_at"], reverse=True)
    return items


def prune(kind):
    """Trim automatic snapshots; manual ones are kept until deleted by hand."""
    limit = RETENTION.get(kind)
    if not limit:
        return
    same_kind = [m for m in listing() if m.get("kind") == kind]
    for meta in same_kind[limit:]:
        delete(meta["name"], allow_manual=False)


def path_for(name):
    """Resolve a snapshot name to a file, refusing anything outside backups/."""
    if not name or "/" in name or "\\" in name or name.startswith("."):
        raise ValueError("invalid snapshot name")
    target = os.path.normpath(os.path.join(BACKUP_DIR, name + ".db"))
    if os.path.dirname(target) != os.path.normpath(BACKUP_DIR):
        raise ValueError("invalid snapshot name")
    if not os.path.isfile(target):
        raise FileNotFoundError("no snapshot named %s" % name)
    return target


def restore(name):
    """Replace the live database with a snapshot.

    The current state is snapshotted first (kind "safety"), so an unwanted
    restore can itself be undone.
    """
    source = path_for(name)

    # Verify before touching anything live.
    check = sqlite3.connect("file:%s?mode=ro" % source, uri=True)
    try:
        check.execute("SELECT COUNT(*) FROM problem_state").fetchone()
        check.execute("SELECT COUNT(*) FROM submissions").fetchone()
    finally:
        check.close()

    safety = create(label="before restoring %s" % name, kind="safety")

    live = _db_path()
    os.makedirs(os.path.dirname(live), exist_ok=True)
    shutil.copyfile(source, live)
    # Drop any stale write-ahead files so the restored copy is what gets read.
    for suffix in ("-wal", "-shm"):
        stale = live + suffix
        if os.path.exists(stale):
            os.remove(stale)

    return {"restored": name, "safety_snapshot": safety["name"] if safety else None}


def delete(name, allow_manual=True):
    target = path_for(name)
    if not allow_manual:
        pass  # caller already filtered by kind
    os.remove(target)
    sidecar = _meta_path(target)
    if os.path.exists(sidecar):
        os.remove(sidecar)
    return True


def export_notes(directory=None):
    """Write every problem's notes out as plain .md files.

    Insurance of a different shape: readable without SQLite, greppable, and
    easy to commit somewhere else if you want a second copy.
    """
    from engine import store

    directory = directory or os.path.join(
        EXPORT_DIR, time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(directory, exist_ok=True)

    with store.connect() as conn:
        rows = conn.execute(
            "SELECT slug, notes FROM problem_state"
            " WHERE length(trim(notes)) > 0 ORDER BY slug"
        ).fetchall()

    written = []
    for row in rows:
        path = os.path.join(directory, "%s.md" % row["slug"])
        with open(path, "w", encoding="utf-8") as f:
            f.write("# %s\n\n%s\n" % (row["slug"], row["notes"]))
        written.append(os.path.basename(path))

    return {"directory": directory, "files": written}
