# Working on this project

## The database holds irreplaceable user data — never delete or overwrite it

`data/app.db` is the **only** copy of the user's notes, code drafts and
submission history. He values the notes highly; they represent months of
studying and cannot be regenerated. This has already been destroyed once by an
assistant running `rm -f data/app.db` to "reset demo data" before a commit.

**Never do any of these:**

- `rm data/app.db`, `rm -rf data/`, or any deletion or truncation of that file
- `UPDATE` / `DELETE` / `INSERT` against `data/app.db` for testing
- calling `store.*` write functions (`save_state`, `add_submission`, …) without
  first redirecting `OCQ_DB` — module-level imports read it at import time
- submitting or running solutions through a server that points at the real
  database, when the goal is to test rather than to demo

`data/` is gitignored. A dirty working tree is **not** a reason to clear it —
git already ignores it, so it never needs cleaning before a commit.

## Testing: redirect to a scratch database first

Two environment variables exist for exactly this, and they are read at import
time, so they must be set **before** importing anything from `engine/`:

```python
import os, tempfile
scratch = tempfile.mkdtemp()
os.environ["OCQ_DB"] = os.path.join(scratch, "app.db")
os.environ["OCQ_BACKUPS"] = os.path.join(scratch, "backups")

from engine import store, backup   # only now
```

`tools/test_backup.py` is the worked example, and it asserts the redirect took
effect before doing anything destructive. Copy that pattern.

To exercise the HTTP API against throwaway data, start a second server with the
override and a different port:

```bash
OCQ_DB=/tmp/scratch.db python3 server.py --port 8899 --no-browser
```

## Before anything risky, take a snapshot

```bash
python3 tools/backup.py save "before <whatever you are about to do>"
```

Snapshots live in `backups/` at the repo root — deliberately outside `data/`, so
resetting the data directory cannot take the safety net with it. Restore with
`python3 tools/backup.py restore <name>`; restoring always snapshots the current
state first, so it is itself undoable.

## The user may be using the app while you work

He runs the server himself (often via `start.command` on port 8777). Check
before assuming a port is free, and never kill a Python process on 8777 without
asking — it is probably his session, and both servers share `data/app.db`. Use a
different port for your own verification.

## Adding problems

Each problem is a folder under `problems/` with `meta.json`, `description.md`,
`solution.md` and `starter.py`. The README documents the schema. Two rules:

- Generate expected test outputs from a reference implementation, never by hand.
- Finish with `python3 tools/verify.py`, which runs every editorial against its
  own suite and asserts the starter stub fails.

Write problem statements in original wording rather than copying LeetCode or
NeetCode text.

## House style

No dependencies. Python standard library on the server, vanilla JS on the
client — no pip, no npm, no CDN, no build step. The whole point is that it works
with no internet. Do not add a package manager or a bundler.
