#!/usr/bin/env python3
"""Run every editorial solution in every problem against its own test suite.

Use this after adding or editing a problem — it catches wrong expected outputs,
broken editorials, and test suites so weak the starter stub passes them.

    python3 tools/verify.py            # all problems
    python3 tools/verify.py <slug>     # just one
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine import problems, runner  # noqa: E402

# Editorial approaches that are *supposed* to be too slow for the hidden tests.
# Keeping them documented is deliberate: seeing the brute force time out is part
# of the lesson.
EXPECTED_TIMEOUT = {
    ("eating-bananas", "1. Brute Force"),
}


def check(slug):
    problem = problems.load(slug)
    if not problem:
        print("unknown problem: %s" % slug)
        return 1

    blocks = re.findall(r"```python\n(.*?)```", problem["solution"], re.S)
    headings = re.findall(r"^## (.+)$", problem["solution"], re.M)
    print("\n%s — %d tests, %d editorial solution(s)"
          % (problem["title"], len(problem["tests"]), len(blocks)))

    failures = 0
    for i, code in enumerate(blocks):
        name = headings[i] if i < len(headings) else "block %d" % (i + 1)
        verdict = runner.run_tests(code, problem, problem["tests"])
        expected_slow = (slug, name) in EXPECTED_TIMEOUT
        ok = (verdict["status"] == "accepted"
              or (expected_slow and verdict["status"] == "timeout"))

        note = " (expected)" if expected_slow and verdict["status"] == "timeout" else ""
        print("  %-4s %-44s %-21s %s/%s%s"
              % ("ok" if ok else "FAIL", name[:44], verdict["label"],
                 verdict["passed"], verdict["total"], note))

        if not ok:
            failures += 1
            if verdict.get("error"):
                print("       %s" % verdict["error"].replace("\n", " | ")[:160])
            bad = [r for r in verdict["results"]
                   if r["status"] not in ("passed", "ran")]
            if bad:
                first = bad[0]
                print("       test %d: got %r, expected %r"
                      % (first["index"] + 1, first.get("output"), first.get("expected")))
                print("       input: %s" % str(first.get("input"))[:200])

    # A starter stub that passes means the tests prove nothing.
    starter = runner.run_tests(
        problem["languages"]["python"]["starter"], problem, problem["tests"])
    if starter["status"] == "accepted":
        print("  FAIL [starter stub]  passes the suite — the tests are too weak")
        failures += 1
    else:
        print("  ok   [starter stub]  rejected (%s)" % starter["label"])

    return failures


def main():
    targets = sys.argv[1:] or problems.slugs()
    failures = sum(check(slug) for slug in targets)
    print("\n%s" % ("All editorials pass." if not failures
                    else "%d failure(s)." % failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
