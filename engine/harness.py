"""Test harness executed in a throwaway subprocess.

Usage: python3 harness.py <payload.json> <result.json>

The payload describes the user's code and the tests to run against it. Results
are flushed to <result.json> after every test so that a hard kill (infinite
loop hitting the wall-clock limit) still tells us which test hung.
"""

import copy
import io
import json
import sys
import time
import traceback
from contextlib import redirect_stdout, redirect_stderr

USER_FILENAME = "<solution>"
MAX_STDOUT_CHARS = 20000


def normalize(value):
    """Make results comparable regardless of tuple/list or int/bool nesting."""
    if isinstance(value, tuple):
        return [normalize(v) for v in value]
    if isinstance(value, list):
        return [normalize(v) for v in value]
    if isinstance(value, set):
        return sorted(normalize(v) for v in value)
    if isinstance(value, dict):
        return {k: normalize(v) for k, v in value.items()}
    return value


def matches(actual, expected, mode):
    a, e = normalize(actual), normalize(expected)
    if mode == "unordered":
        try:
            return sorted(a) == sorted(e)
        except TypeError:
            return sorted(map(repr, a)) == sorted(map(repr, e))
    if mode == "set":
        return {repr(x) for x in a} == {repr(x) for x in e}
    if mode == "float":
        try:
            return abs(float(a) - float(e)) <= 1e-5
        except (TypeError, ValueError):
            return a == e
    if mode == "any_of":
        return any(a == cand for cand in e)
    return a == e


def jsonable(value):
    """Best-effort conversion so any return value survives JSON encoding."""
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return repr(value)


def clean_traceback(exc):
    """Show only frames from the user's own code, with editor line numbers."""
    tb = exc.__traceback__
    frames = [f for f in traceback.extract_tb(tb) if f.filename == USER_FILENAME]
    lines = []
    if frames:
        lines.append("Traceback (most recent call last):")
        for f in frames:
            lines.append('  Line %d, in %s' % (f.lineno, f.name))
            if f.line:
                lines.append("    " + f.line.strip())
    lines.append("%s: %s" % (type(exc).__name__, exc))
    return "\n".join(lines)


def materialize(value, env):
    """Expand {"$py": "<expr>"} generators inside a test input."""
    if isinstance(value, dict):
        if set(value) == {"$py"}:
            return eval(value["$py"], dict(env))  # trusted: local problem file
        return {k: materialize(v, env) for k, v in value.items()}
    if isinstance(value, list):
        return [materialize(v, env) for v in value]
    return value


def truncate(text):
    if len(text) > MAX_STDOUT_CHARS:
        return text[:MAX_STDOUT_CHARS] + "\n... (output truncated)"
    return text


def main():
    payload_path, result_path = sys.argv[1], sys.argv[2]
    with open(payload_path) as f:
        payload = json.load(f)

    compare_mode = payload.get("compare", "exact")
    entry = payload.get("entry", {})
    params = [p["name"] for p in payload.get("params", [])]
    tests = payload.get("tests", [])

    # A test with "check": false is executed for its output only — it does not
    # count toward the verdict (used for scratch cases with no expected value).
    checked_total = sum(1 for t in tests if t.get("check", True))

    result = {
        "status": "running",
        "passed": 0,
        "total": checked_total,
        "results": [],
        "runtime_ms": 0,
    }

    def flush():
        with open(result_path, "w") as f:
            json.dump(result, f)

    flush()

    # --- load the user's code -------------------------------------------------
    scope = {"__name__": "__solution__"}
    try:
        exec(compile(payload.get("prelude", ""), "<prelude>", "exec"), scope)
    except Exception as exc:  # a broken prelude is a problem-definition bug
        result["status"] = "internal_error"
        result["error"] = "Prelude failed: %s" % exc
        flush()
        return

    buf = io.StringIO()
    try:
        with redirect_stdout(buf), redirect_stderr(buf):
            exec(compile(payload["code"], USER_FILENAME, "exec"), scope)
    except SyntaxError as exc:
        result["status"] = "compile_error"
        result["error"] = "Line %s: %s" % (exc.lineno, exc.msg)
        result["stdout"] = truncate(buf.getvalue())
        flush()
        return
    except Exception as exc:
        result["status"] = "runtime_error"
        result["error"] = clean_traceback(exc)
        result["stdout"] = truncate(buf.getvalue())
        flush()
        return

    # --- resolve the entry point ---------------------------------------------
    try:
        cls_name, method_name = entry.get("class"), entry["method"]
        if cls_name:
            if cls_name not in scope:
                raise NameError("class %s is not defined" % cls_name)
            target_cls = scope[cls_name]
            if not hasattr(target_cls, method_name):
                raise NameError(
                    "%s has no method %s()" % (cls_name, method_name)
                )
        else:
            if method_name not in scope:
                raise NameError("function %s() is not defined" % method_name)
    except Exception as exc:
        result["status"] = "runtime_error"
        result["error"] = "%s: %s" % (type(exc).__name__, exc)
        flush()
        return

    # --- run the tests --------------------------------------------------------
    started = time.perf_counter()
    for index, test in enumerate(tests):
        entry_row = {
            "index": index,
            "status": "running",
            "checked": bool(test.get("check", True)),
            "expected": jsonable(test.get("output")),
            "input": None,
            "stdout": "",
            "error": None,
            "runtime_ms": 0,
        }
        result["results"].append(entry_row)

        try:
            args_source = materialize(copy.deepcopy(test.get("input", {})), scope)
        except Exception as exc:
            entry_row["status"] = "error"
            entry_row["error"] = "Bad test input: %s" % exc
            result["status"] = "internal_error"
            flush()
            return

        # Record the input before running so a hard timeout still shows which
        # case hung.
        entry_row["input"] = {k: jsonable(v) for k, v in args_source.items()}
        flush()
        args = [copy.deepcopy(args_source[name]) for name in params]

        out = io.StringIO()
        t0 = time.perf_counter()
        try:
            with redirect_stdout(out), redirect_stderr(out):
                callee = (
                    getattr(scope[cls_name](), method_name)
                    if cls_name
                    else scope[method_name]
                )
                returned = callee(*args)
            entry_row["runtime_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            entry_row["output"] = jsonable(returned)
            if not test.get("check", True):
                entry_row["status"] = "ran"
            else:
                ok = matches(returned, test.get("output"),
                             test.get("compare", compare_mode))
                entry_row["status"] = "passed" if ok else "failed"
                if ok:
                    result["passed"] += 1
        except Exception as exc:
            entry_row["runtime_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            entry_row["status"] = "error"
            entry_row["error"] = clean_traceback(exc)
            entry_row["output"] = None
        finally:
            entry_row["stdout"] = truncate(out.getvalue())

        result["runtime_ms"] = round((time.perf_counter() - started) * 1000, 3)
        flush()

        if entry_row["status"] == "error":
            result["status"] = "runtime_error"
            flush()
            return

    result["status"] = "accepted" if result["passed"] == result["total"] else "wrong_answer"
    result["runtime_ms"] = round((time.perf_counter() - started) * 1000, 3)
    flush()


if __name__ == "__main__":
    main()
