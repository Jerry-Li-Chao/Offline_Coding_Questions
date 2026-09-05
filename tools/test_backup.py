#!/usr/bin/env python3
"""Tests for the snapshot/restore machinery.

    python3 tools/test_backup.py

This file sets OCQ_DB and OCQ_BACKUPS to a throwaway temp directory **before
importing anything from engine/**, so it physically cannot reach your real
notes, submissions or snapshots. Any future test must do the same.
"""

import os
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = tempfile.mkdtemp(prefix="ocq-test-")

# MUST happen before the engine imports below — module-level constants read
# these at import time.
os.environ["OCQ_DB"] = os.path.join(SCRATCH, "app.db")
os.environ["OCQ_BACKUPS"] = os.path.join(SCRATCH, "backups")

sys.path.insert(0, ROOT)

from engine import backup, store  # noqa: E402

REAL_DB = os.path.join(ROOT, "data", "app.db")

passed = failed = 0


def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print("  ok   %s" % label)
    else:
        failed += 1
        print("  FAIL %s %s" % (label, detail))


def main():
    # The guard that matters most: prove we are nowhere near the real files.
    check("test DB is the scratch copy, not the real one",
          store.DB_PATH != REAL_DB and store.DB_PATH.startswith(SCRATCH),
          store.DB_PATH)
    check("test backups are the scratch copy",
          backup.BACKUP_DIR.startswith(SCRATCH), backup.BACKUP_DIR)
    if failed:
        print("\nAborting: the environment override did not take effect.")
        return 1

    store.init_db()
    store.save_state("binary-search", notes="the invariant is [l, r] inclusive")
    store.add_submission("binary-search", "python", "code", {
        "status": "accepted", "label": "Accepted", "passed": 20, "total": 20,
        "runtime_ms": 1.0, "results": [],
    })

    snap = backup.create(label="after solving", kind="manual")
    check("snapshot records the counts", snap["counts"]["notes"] == 1
          and snap["counts"]["submissions"] == 1, snap["counts"])

    check("unchanged auto snapshot is skipped",
          backup.create(kind="auto", skip_if_unchanged=True) is None)

    # a change should no longer be skipped
    store.save_state("binary-search", notes="edited")
    auto = backup.create(kind="auto", skip_if_unchanged=True)
    check("changed auto snapshot is taken", auto is not None)

    # the accident: database deleted outright
    os.remove(store.DB_PATH)
    store.init_db()
    check("notes really are gone after deletion",
          store.get_state("binary-search")["notes"] == "")

    result = backup.restore(snap["name"])
    check("restore brings the notes back",
          store.get_state("binary-search")["notes"].startswith("the invariant"))
    check("restore keeps the submission",
          len(store.list_submissions("binary-search")) == 1)
    check("restore leaves a safety snapshot",
          bool(result["safety_snapshot"]))

    backup.restore(result["safety_snapshot"])
    check("the restore itself is undoable",
          store.get_state("binary-search")["notes"] == "")

    for bad in ["../../etc/passwd", "..", "/etc/passwd", ".hidden", ""]:
        try:
            backup.path_for(bad)
            check("refuses path %r" % bad, False)
        except (ValueError, FileNotFoundError):
            check("refuses path %r" % bad, True)

    backup.restore(snap["name"])
    export = backup.export_notes()
    check("notes export as markdown", export["files"] == ["binary-search.md"],
          export["files"])
    with open(os.path.join(export["directory"], "binary-search.md")) as f:
        check("exported markdown holds the note text",
              "the invariant" in f.read())

    check("listing is newest first",
          [m["created_at"] for m in backup.listing()] ==
          sorted([m["created_at"] for m in backup.listing()], reverse=True))

    backup.delete(snap["name"])
    check("delete removes the snapshot",
          all(m["name"] != snap["name"] for m in backup.listing()))

    check("the real database was never touched",
          not os.path.exists(REAL_DB) or REAL_DB not in
          (store.DB_PATH, backup.BACKUP_DIR))

    print("\n%d passed, %d failed" % (passed, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        shutil.rmtree(SCRATCH, ignore_errors=True)
