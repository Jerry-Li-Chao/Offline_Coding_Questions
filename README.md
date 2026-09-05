# Offline Coding Questions

A local, no-internet-required practice environment for coding interview questions —
read the problem, write Python, edit and run test cases, submit against a full
hidden suite, keep notes, and track every attempt. Everything lives on your
machine.

Modeled on the NeetCode problem workspace, rebuilt to run with zero network
access and zero dependencies.

## Running it

```bash
python3 server.py
```

Then open <http://127.0.0.1:8777> (the server opens it for you). On macOS you can
also double-click `start.command` in Finder.

Requirements: **Python 3.8+**. That's it — no `pip install`, no Node, no CDN, no
network. The server binds to `127.0.0.1` only.

Useful flags:

```bash
python3 server.py --port 9000 --no-browser
```

## What it does

| Feature | Notes |
| --- | --- |
| **Description tab** | Markdown problem statement with collapsible hints |
| **Solution tab** | Full editorial, multiple approaches, hidden behind a "show solution" guard so you attempt it first |
| **Notes tab** | Markdown notes in a live split — you type on top, the rendered preview updates underneath as you go. Autosaved, draggable divider, built-in syntax cheatsheet |
| **Submissions tab** | Every submission with verdict, tests passed, runtime and the exact code — reloadable into the editor |
| **Editor** | Python syntax highlighting, line numbers, smart indent, bracket completion, comment toggle (`⌘/`), undo/redo |
| **Test Cases** | Add, edit and delete cases inline. Leave *expected* blank to just see what your code returns |
| **Run** | Executes the visible test cases |
| **Submit** | Runs the full suite and records the verdict in your history |
| **Progress** | Solved / attempted status per problem, plus starring |
| **Layout** | Draggable split panes; the bottom console collapses with the chevron in its tab bar |

Keyboard: `⌘↩` run, `⇧⌘↩` submit (`Ctrl` on Windows/Linux).

Notes support headings, bold/italic/strikethrough, inline and fenced code
(Python-highlighted), bullet/numbered lists, `- [ ]` checklists, blockquotes,
links, tables, rules, and `<details>` collapsible sections — handy for writing a
hint you want to re-test yourself on later. The **Markdown cheatsheet** toggle in
the Notes tab lists all of it.

## Where your data lives

Everything is in a SQLite file at `data/app.db`:

- draft code per problem (autosaved as you type)
- your notes
- your custom test cases
- full submission history with verdicts and code

`data/` is gitignored so your progress stays private. Delete the file to reset;
back it up to keep your history.

## Adding a problem

Each problem is a folder under `problems/`. Copy `problems/binary-search/` and
edit four files:

```
problems/<slug>/
├── meta.json        signature, test suite, metadata
├── description.md   the problem statement
├── solution.md      the editorial
└── starter.py       the starter code shown in the editor
```

`meta.json` looks like this:

```jsonc
{
  "title": "Binary Search",
  "difficulty": "Easy",              // Easy | Medium | Hard
  "topics": ["Binary Search"],
  "entry": { "class": "Solution", "method": "search" },
  "params": [                        // order matters: these are the call arguments
    { "name": "nums", "type": "int[]" },
    { "name": "target", "type": "int" }
  ],
  "returns": { "type": "int" },
  "compare": "exact",                // exact | unordered | set | float | any_of
  "timeout_sec": 10,
  "languages": {
    "python": {
      "starter_file": "starter.py",
      "prelude": "from typing import List\n"   // runs before your code
    }
  },
  "tests": [
    { "input": { "nums": [-1, 0, 2, 4, 6, 8], "target": 4 },
      "output": 3,
      "sample": true },              // sample tests prefill the Test Cases panel
    { "input": { "nums": { "$py": "list(range(-5000, 5000))" }, "target": 0 },
      "output": 5000 }               // $py generates large inputs without bloating the file
  ]
}
```

Comparison modes:

| Mode | Use for |
| --- | --- |
| `exact` | the default — deep equality |
| `unordered` | list results where order doesn't matter |
| `set` | results compared as sets |
| `float` | numeric results, tolerance `1e-5` |
| `any_of` | `output` is a list of acceptable answers |

Per-test `"compare"` overrides the problem-level setting, and `"check": false`
runs a test for its output only, without a verdict.

Add `"order": <n>` to control where the problem appears in the list; without it
the problem sorts to the end. Add `"section": "<name>"` to group it under a
heading in the list view (it falls back to the first entry in `topics`).

Restart the server (or just reload the page — problems are read from disk on
every request) to pick up new problems.

### Design problems

For "implement this class" problems, use a `design` entry point. The tests
replay a list of calls against one instance, LeetCode-style:

```jsonc
{
  "entry": { "type": "design", "class": "TimeMap" },
  "params": [
    { "name": "commands", "type": "string[]" },
    { "name": "inputs", "type": "any[][]" }
  ],
  "tests": [{
    "input": {
      "commands": ["TimeMap", "set", "get"],
      "inputs": [[], ["alice", "happy", 1], ["alice", 1]]
    },
    "output": [null, null, "happy"]
  }]
}
```

The first command constructs the class and contributes `null` to the output;
each later command calls that method and appends its return value.

### Checking your work

```bash
python3 tools/verify.py            # every problem
python3 tools/verify.py <slug>     # just one
```

This runs each ```python block in `solution.md` against the problem's own test
suite, and confirms the starter stub *fails* — a suite the stub passes isn't
testing anything. Each block is labelled with the heading it actually sits under,
so sections with no code or several snippets still report accurately.

Approaches that are expected to fail (a brute force kept for teaching, or a
top-down solution that exceeds Python's recursion depth) are listed with the
status they may return in `KNOWN_LIMITATIONS` at the top of the script.

## How it runs your code

`server.py` writes your code and the tests to a temp directory and runs
`engine/harness.py` in a **separate Python subprocess** with a wall-clock limit
(`timeout_sec`, default 10s). The harness:

- executes your code with the problem's prelude in scope
- calls the entry point once per test with deep-copied arguments, so mutating an
  input can't leak into the next case
- captures `print` output per test and shows it in the result panel
- reports syntax errors with your editor's line numbers, and tracebacks trimmed
  to your own frames
- flushes results after every test, so a hung test is still identified by name

Your code runs as a normal local Python process with your permissions — the same
as running `python3 solution.py` yourself. Don't paste in code you wouldn't run
in a terminal.

## Layout

```
server.py              stdlib HTTP server + JSON API
engine/
├── harness.py         runs in the subprocess; executes and grades
├── runner.py          spawns the subprocess, enforces the timeout
├── problems.py        loads problems from disk
└── store.py           SQLite: drafts, notes, cases, submissions
problems/<slug>/       problem content
tools/verify.py        runs every editorial against its own tests
static/                the UI (vanilla JS, no build step, no dependencies)
data/app.db            your local progress (gitignored)
```

## Problems included

19 problems across two NeetCode 150 sections, in curriculum order. The list view
groups them by section and tracks solved counts per section.

### Binary Search

| # | Problem | Difficulty | Tests |
| --- | --- | --- | --- |
| 1 | Binary Search | Easy | 20 |
| 2 | Search a 2D Matrix | Medium | 25 |
| 3 | Koko Eating Bananas | Medium | 19 |
| 4 | Find Minimum in Rotated Sorted Array | Medium | 20 |
| 5 | Search in Rotated Sorted Array | Medium | 35 |
| 6 | Time Based Key-Value Store | Medium | 9 |
| 7 | Median of Two Sorted Arrays | Hard | 24 |

### 1-D DP

| # | Problem | Difficulty | Tests |
| --- | --- | --- | --- |
| 8 | Climbing Stairs | Easy | 15 |
| 9 | Min Cost Climbing Stairs | Easy | 16 |
| 10 | House Robber | Medium | 18 |
| 11 | House Robber II | Medium | 17 |
| 12 | Longest Palindromic Substring | Medium | 21 |
| 13 | Palindromic Substrings | Medium | 16 |
| 14 | Decode Ways | Medium | 27 |
| 15 | Coin Change | Medium | 20 |
| 16 | Maximum Product Subarray | Medium | 20 |
| 17 | Word Break | Medium | 20 |
| 18 | Longest Increasing Subsequence | Medium | 20 |
| 19 | Partition Equal Subset Sum | Medium | 21 |

The DP editorials deliberately walk the same four steps every time — recursion,
memoize, flip bottom-up, shrink the state — so the pattern becomes the thing you
learn rather than twelve unrelated tricks.

Every editorial in every problem is executed against that problem's own test
suite by `tools/verify.py`, so the published solutions are known to pass. A few
naive approaches are published *because* they fail (an exponential recursion, or
a top-down solution that exceeds Python's recursion depth); those are listed with
their reasons in `KNOWN_LIMITATIONS` in the script, and each editorial says so in
the text.
