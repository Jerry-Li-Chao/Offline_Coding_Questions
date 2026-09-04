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

# Editorial approaches that are *supposed* to fail the hidden suite, and why.
# Keeping them published is deliberate — seeing the naive version blow up is
# part of the lesson, and each editorial says so in the text.
KNOWN_LIMITATIONS = {
    # exponential brute force / plain recursion vs. the large hidden inputs
    ("eating-bananas", "1. Brute Force"): "timeout",
    ("min-cost-climbing-stairs", "1. Recursion"): "timeout",
    ("house-robber", "1. Recursion"): "timeout",
    ("decode-ways", "1. Recursion"): "timeout",
    ("coin-change", "1. Recursion"): "timeout",
    ("word-break", "1. Recursion"): "timeout",
    ("longest-increasing-subsequence", "1. Recursion"): "timeout",
    ("partition-equal-subset-sum", "1. Recursion"): "timeout",
    # correct and fast, but recurses `amount` deep — past CPython's 1000 frames
    ("coin-change", "2. Memoization (Top-Down)"): "runtime_error",
}


def extract_blocks(markdown):
    """Pair every ```python block with the heading it actually sits under.

    Counting blocks and headings separately gets this wrong the moment a
    section has no code (a prose intro) or more than one snippet.
    """
    blocks = []
    heading = "(untitled)"
    seen = {}
    lines = markdown.split("\n")
    i = 0
    while i < len(lines):
        match = re.match(r"^#{2,3}\s+(.*\S)\s*$", lines[i])
        if match:
            heading = match.group(1)
            i += 1
            continue
        if re.match(r"^```python\s*$", lines[i]):
            i += 1
            body = []
            while i < len(lines) and not re.match(r"^```\s*$", lines[i]):
                body.append(lines[i])
                i += 1
            seen[heading] = seen.get(heading, 0) + 1
            name = heading if seen[heading] == 1 else "%s [%d]" % (heading, seen[heading])
            blocks.append((name, "\n".join(body)))
        i += 1
    return blocks


def check(slug):
    problem = problems.load(slug)
    if not problem:
        print("unknown problem: %s" % slug)
        return 1

    blocks = extract_blocks(problem["solution"])
    print("\n%s — %d tests, %d editorial solution(s)"
          % (problem["title"], len(problem["tests"]), len(blocks)))

    failures = 0
    for name, code in blocks:
        verdict = runner.run_tests(code, problem, problem["tests"])
        allowed = KNOWN_LIMITATIONS.get((slug, name))
        ok = verdict["status"] == "accepted" or verdict["status"] == allowed

        note = " (expected)" if allowed and verdict["status"] == allowed else ""
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
