"""Spawns the harness in a subprocess and turns its output into a verdict."""

import json
import os
import subprocess
import sys
import tempfile

HARNESS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "harness.py")

STATUS_LABELS = {
    "accepted": "Accepted",
    "wrong_answer": "Wrong Answer",
    "runtime_error": "Runtime Error",
    "compile_error": "Compile Error",
    "timeout": "Time Limit Exceeded",
    "internal_error": "Internal Error",
}


def run_tests(code, problem, tests, timeout_sec=None):
    """Run `tests` against `code`. Returns a verdict dict for the UI."""
    lang = problem.get("languages", {}).get("python", {})
    payload = {
        "code": code,
        "prelude": lang.get("prelude", ""),
        "entry": problem.get("entry", {}),
        "params": problem.get("params", []),
        "compare": problem.get("compare", "exact"),
        "tests": tests,
    }
    limit = timeout_sec or problem.get("timeout_sec", 10)

    workdir = tempfile.mkdtemp(prefix="ocq-")
    payload_path = os.path.join(workdir, "payload.json")
    result_path = os.path.join(workdir, "result.json")
    with open(payload_path, "w") as f:
        json.dump(payload, f)
    with open(result_path, "w") as f:
        json.dump({"status": "running", "passed": 0, "total": len(tests), "results": []}, f)

    timed_out = False
    try:
        subprocess.run(
            [sys.executable, HARNESS, payload_path, result_path],
            cwd=workdir,
            timeout=limit,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
    except subprocess.TimeoutExpired:
        timed_out = True

    try:
        with open(result_path) as f:
            result = json.load(f)
    except (OSError, ValueError):
        result = {
            "status": "internal_error",
            "passed": 0,
            "total": len(tests),
            "results": [],
            "error": "The runner produced no result.",
        }

    if timed_out or result.get("status") == "running":
        result["status"] = "timeout"
        result["error"] = "Execution exceeded the %ss limit." % limit
        for row in result.get("results", []):
            if row.get("status") == "running":
                row["status"] = "timeout"
                row["error"] = "This test did not finish in time."

    result["label"] = STATUS_LABELS.get(result.get("status"), result.get("status"))
    result["timeout_sec"] = limit
    return result
