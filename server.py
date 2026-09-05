#!/usr/bin/env python3
"""Offline Coding Questions — a local, no-internet-required practice app.

Run:  python3 server.py         (then open http://127.0.0.1:8777)

Everything is standard library: no pip install, no CDN, no network access.
The server binds to localhost only and executes your Python in a subprocess
with a wall-clock limit.
"""

import argparse
import json
import mimetypes
import os
import posixpath
import re
import sqlite3
import sys
import threading
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import backup, problems, runner, store  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT, "static")
MAX_BODY = 4 * 1024 * 1024
AUTOSAVE_SECONDS = 30 * 60


class Handler(BaseHTTPRequestHandler):
    server_version = "OfflineCodingQuestions/1.0"
    protocol_version = "HTTP/1.1"

    # ---------------------------------------------------------------- plumbing
    def log_message(self, fmt, *args):
        if os.environ.get("OCQ_VERBOSE"):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code, body=b"", content_type="text/plain; charset=utf-8", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, data, code=200):
        body = json.dumps(data).encode("utf-8")
        self._send(code, body, "application/json; charset=utf-8")

    def _error(self, code, message):
        self._json({"error": message}, code)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        if length > MAX_BODY:
            raise ValueError("request body too large")
        return json.loads(self.rfile.read(length).decode("utf-8"))

    # ------------------------------------------------------------------ routes
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        try:
            if path.startswith("/api/"):
                return self._api_get(path)
            return self._static(path)
        except Exception as exc:  # keep the dev server alive
            return self._error(500, "%s: %s" % (type(exc).__name__, exc))

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        try:
            if not path.startswith("/api/"):
                return self._error(404, "Not found")
            return self._api_post(path, self._body())
        except ValueError as exc:
            return self._error(400, str(exc))
        except Exception as exc:
            return self._error(500, "%s: %s" % (type(exc).__name__, exc))

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path

        match = re.fullmatch(r"/api/submissions/(\d+)", path)
        if match:
            store.delete_submission(int(match.group(1)))
            return self._json({"ok": True})

        match = re.fullmatch(r"/api/backups/([A-Za-z0-9._-]+)", path)
        if match:
            try:
                backup.delete(match.group(1))
            except (ValueError, FileNotFoundError) as exc:
                return self._error(404, str(exc))
            return self._json({"ok": True})

        return self._error(404, "Not found")

    # ------------------------------------------------------------------ static
    def _static(self, path):
        if path in ("/", "/index.html"):
            rel = "index.html"
        elif re.fullmatch(r"/problems/[A-Za-z0-9._-]+", path) or path == "/backups":
            rel = "index.html"  # deep links render the SPA shell
        else:
            rel = posixpath.normpath(path).lstrip("/")

        target = os.path.normpath(os.path.join(STATIC_DIR, rel))
        if not target.startswith(STATIC_DIR) or not os.path.isfile(target):
            return self._send(404, b"Not found")

        ctype = mimetypes.guess_type(target)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript",):
            ctype += "; charset=utf-8"
        with open(target, "rb") as f:
            self._send(200, f.read(), ctype)

    # --------------------------------------------------------------- API (GET)
    def _api_get(self, path):
        if path == "/api/problems":
            statuses = store.all_statuses()
            items = []
            for slug in problems.slugs():
                problem = problems.load(slug)
                state = store.get_state(slug)
                items.append(
                    problems.summary(
                        problem, statuses.get(slug, "todo"), state["starred"]
                    )
                )
            # curriculum order, not alphabetical
            items.sort(key=lambda item: (item["order"], item["title"]))
            return self._json({"problems": items, "stats": store.stats()})

        match = re.fullmatch(r"/api/problems/([A-Za-z0-9._-]+)", path)
        if match:
            slug = match.group(1)
            problem = problems.load(slug)
            if not problem:
                return self._error(404, "Unknown problem: %s" % slug)
            state = store.get_state(slug)
            return self._json(
                problems.public_view(
                    problem,
                    state["status"],
                    state["starred"],
                    {
                        "code": state["code"],
                        "notes": state["notes"],
                        "testcases": state["testcases"],
                        "lang": state["lang"],
                    },
                )
            )

        match = re.fullmatch(r"/api/problems/([A-Za-z0-9._-]+)/submissions", path)
        if match:
            return self._json({"submissions": store.list_submissions(match.group(1))})

        match = re.fullmatch(r"/api/submissions/(\d+)", path)
        if match:
            item = store.get_submission(int(match.group(1)))
            if not item:
                return self._error(404, "Unknown submission")
            return self._json(item)

        if path == "/api/backups":
            return self._json({
                "backups": backup.listing(),
                "current": backup.summarize(store.DB_PATH),
                "directory": backup.BACKUP_DIR,
            })

        match = re.fullmatch(r"/api/backups/([A-Za-z0-9._-]+)/download", path)
        if match:
            try:
                target = backup.path_for(match.group(1))
            except (ValueError, FileNotFoundError) as exc:
                return self._error(404, str(exc))
            with open(target, "rb") as f:
                return self._send(
                    200, f.read(), "application/octet-stream",
                    {"Content-Disposition":
                     'attachment; filename="%s.db"' % match.group(1)})

        return self._error(404, "Not found")

    # -------------------------------------------------------------- API (POST)
    def _api_post(self, path, body):
        match = re.fullmatch(r"/api/problems/([A-Za-z0-9._-]+)/state", path)
        if match:
            slug = match.group(1)
            if not problems.load(slug):
                return self._error(404, "Unknown problem: %s" % slug)
            store.save_state(
                slug,
                code=body.get("code"),
                notes=body.get("notes"),
                testcases=body.get("testcases"),
                starred=body.get("starred"),
                lang=body.get("lang"),
            )
            return self._json({"ok": True})

        if path == "/api/run":
            return self._json(self._execute(body, submit=False))

        if path == "/api/submit":
            return self._json(self._execute(body, submit=True))

        if path == "/api/backups":
            meta = backup.create(label=body.get("label"), kind="manual")
            if not meta:
                return self._error(400, "There is no database to snapshot yet.")
            return self._json({"backup": meta})

        match = re.fullmatch(r"/api/backups/([A-Za-z0-9._-]+)/restore", path)
        if match:
            try:
                return self._json(backup.restore(match.group(1)))
            except FileNotFoundError as exc:
                return self._error(404, str(exc))
            except (ValueError, sqlite3.Error) as exc:
                return self._error(400, "Snapshot is not usable: %s" % exc)

        if path == "/api/backups/export-notes":
            return self._json(backup.export_notes())

        return self._error(404, "Not found")

    def _execute(self, body, submit):
        slug = body.get("slug")
        code = body.get("code", "")
        problem = problems.load(slug or "")
        if not problem:
            return {"status": "internal_error", "label": "Internal Error",
                    "error": "Unknown problem: %s" % slug, "passed": 0,
                    "total": 0, "results": []}

        if submit:
            tests = problem.get("tests", [])
        else:
            tests = body.get("tests")
            if not tests:
                tests = problems.sample_tests(problem)

        verdict = runner.run_tests(code, problem, tests)
        verdict["mode"] = "submit" if submit else "run"

        store.save_state(slug, code=code)
        if submit:
            verdict["submissionId"] = store.add_submission(
                slug, "python", code, verdict
            )
            verdict["problemStatus"] = store.get_status(slug)
        return verdict


def start_autosave():
    """Background thread: snapshot periodically, but only when data changed."""
    def tick():
        while True:
            time.sleep(AUTOSAVE_SECONDS)
            try:
                backup.create(kind="auto", skip_if_unchanged=True)
            except Exception as exc:  # a failed backup must never kill the app
                sys.stderr.write("autosave snapshot failed: %s\n" % exc)

    thread = threading.Thread(target=tick, daemon=True, name="ocq-autosave")
    thread.start()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8777)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--no-backup", action="store_true",
                        help="skip the automatic database snapshots")
    args = parser.parse_args()

    store.init_db()

    # Snapshot on the way up, then every AUTOSAVE_SECONDS while anything has
    # changed, then once more on the way down. Unchanged databases are skipped
    # so restarts don't fill the folder with identical copies.
    if not args.no_backup:
        opening = backup.create(kind="auto", skip_if_unchanged=True)
        if opening:
            print("Snapshot saved: %s" % opening["name"])
        start_autosave()

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    url = "http://%s:%d" % (args.host, args.port)

    print("Offline Coding Questions running at %s" % url)
    print("%d problem(s) loaded. Press Ctrl+C to stop." % len(problems.slugs()))
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        if not args.no_backup:
            closing = backup.create(kind="auto", skip_if_unchanged=True)
            if closing:
                print("\nSnapshot saved: %s" % closing["name"])
        print("\nStopped." if args.no_backup else "Stopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
