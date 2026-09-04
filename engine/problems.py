"""Loads problem definitions from the problems/ directory."""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROBLEMS_DIR = os.path.join(ROOT, "problems")


def _read(path, default=""):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return default


def slugs():
    if not os.path.isdir(PROBLEMS_DIR):
        return []
    found = []
    for name in sorted(os.listdir(PROBLEMS_DIR)):
        if os.path.isfile(os.path.join(PROBLEMS_DIR, name, "meta.json")):
            found.append(name)
    return found


def load(slug):
    """Full problem definition, or None if the slug is unknown."""
    if slug not in slugs():
        return None
    folder = os.path.join(PROBLEMS_DIR, slug)
    with open(os.path.join(folder, "meta.json"), encoding="utf-8") as f:
        meta = json.load(f)

    meta["slug"] = meta.get("slug", slug)
    meta["description"] = _read(os.path.join(folder, "description.md"))
    meta["solution"] = _read(os.path.join(folder, "solution.md"))

    python = meta.setdefault("languages", {}).setdefault("python", {})
    starter_file = python.get("starter_file", "starter.py")
    python["starter"] = _read(os.path.join(folder, starter_file)).rstrip("\n")
    return meta


def summary(problem, status="todo", starred=False):
    return {
        "slug": problem["slug"],
        "order": problem.get("order", 9999),
        "section": problem.get("section") or (problem.get("topics") or ["Other"])[0],
        "title": problem.get("title", problem["slug"]),
        "difficulty": problem.get("difficulty", "Unknown"),
        "topics": problem.get("topics", []),
        "source": problem.get("source", ""),
        "tests": len(problem.get("tests", [])),
        "status": status,
        "starred": starred,
    }


def sample_tests(problem):
    """Editable test cases shown in the UI (falls back to the first test)."""
    tests = problem.get("tests", [])
    samples = [t for t in tests if t.get("sample")]
    if not samples:
        samples = tests[:1]
    return [
        {"input": t.get("input", {}), "output": t.get("output")}
        for t in samples
    ]


def public_view(problem, status, starred, state):
    """What the browser needs to render a problem page."""
    return {
        "slug": problem["slug"],
        "title": problem.get("title", problem["slug"]),
        "difficulty": problem.get("difficulty", "Unknown"),
        "topics": problem.get("topics", []),
        "source": problem.get("source", ""),
        "description": problem["description"],
        "solutionMarkdown": problem["solution"],
        "params": problem.get("params", []),
        "returns": problem.get("returns", {}),
        "entry": problem.get("entry", {}),
        "starter": problem["languages"]["python"]["starter"],
        "totalTests": len(problem.get("tests", [])),
        "sampleTests": sample_tests(problem),
        "timeoutSec": problem.get("timeout_sec", 10),
        "status": status,
        "starred": starred,
        "state": state,
    }
