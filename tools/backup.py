#!/usr/bin/env python3
"""Snapshot, list and restore the practice database from the terminal.

    python3 tools/backup.py list
    python3 tools/backup.py save ["a label"]
    python3 tools/backup.py restore <name>
    python3 tools/backup.py delete <name>
    python3 tools/backup.py export-notes

Works whether or not the server is running — sqlite's backup API is safe on a
live database.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine import backup, store  # noqa: E402


def human(size):
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return "%d%s" % (size, unit)
        size /= 1024.0
    return "%.1fTB" % size


def show(meta):
    when = time.strftime("%Y-%m-%d %H:%M", time.localtime(meta["created_at"]))
    counts = meta["counts"]
    line = "  %-34s %-8s %s  %3d notes  %3d submissions  %6s" % (
        meta["name"], meta["kind"], when,
        counts["notes"], counts["submissions"], human(meta["bytes"]))
    if meta.get("label"):
        line += "\n      %s" % meta["label"]
    return line


def main():
    args = sys.argv[1:]
    command = args[0] if args else "list"

    if command == "list":
        items = backup.listing()
        current = backup.summarize(store.DB_PATH)
        print("Live database: %d notes, %d submissions, %d solved"
              % (current["notes"], current["submissions"], current["solved"]))
        print("Snapshots in %s:" % backup.BACKUP_DIR)
        if not items:
            print("  (none yet — run: python3 tools/backup.py save)")
        for meta in items:
            print(show(meta))
        return 0

    if command == "save":
        meta = backup.create(label=" ".join(args[1:]) or None, kind="manual")
        if not meta:
            print("No database to snapshot yet.")
            return 1
        print("Saved:")
        print(show(meta))
        return 0

    if command == "restore":
        if len(args) < 2:
            print("Usage: python3 tools/backup.py restore <name>")
            return 1
        try:
            result = backup.restore(args[1])
        except (FileNotFoundError, ValueError) as exc:
            print("Could not restore: %s" % exc)
            return 1
        print("Restored %s" % result["restored"])
        if result["safety_snapshot"]:
            print("Previous state saved as %s — restore that to undo."
                  % result["safety_snapshot"])
        print("Restart the server (or reload the page) to see it.")
        return 0

    if command == "delete":
        if len(args) < 2:
            print("Usage: python3 tools/backup.py delete <name>")
            return 1
        try:
            backup.delete(args[1])
        except (FileNotFoundError, ValueError) as exc:
            print("Could not delete: %s" % exc)
            return 1
        print("Deleted %s" % args[1])
        return 0

    if command == "export-notes":
        result = backup.export_notes()
        print("Wrote %d note file(s) to %s"
              % (len(result["files"]), result["directory"]))
        return 0

    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main())
