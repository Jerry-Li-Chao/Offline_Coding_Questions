## 1. Brute Force

Store every entry and scan the whole list on each `get`.

```python
class TimeMap:
    def __init__(self):
        self.store = {}          # key -> list of [timestamp, value]

    def set(self, key: str, value: str, timestamp: int) -> None:
        if key not in self.store:
            self.store[key] = []
        self.store[key].append([timestamp, value])

    def get(self, key: str, timestamp: int) -> str:
        result = ""
        for time, value in self.store.get(key, []):
            if time <= timestamp:
                result = value
            else:
                break
        return result
```

**`set`:** `O(1)`  ·  **`get`:** `O(n)`  ·  **Space:** `O(n)`

---

## 2. Binary Search

Two facts make this fast. First, timestamps for a key are **strictly increasing**, so each list is sorted the moment you append — no sorting step. Second, `get` is asking for the rightmost entry at or before a time, which is a boundary search.

```python
class TimeMap:
    def __init__(self):
        self.store = {}          # key -> list of [timestamp, value]

    def set(self, key: str, value: str, timestamp: int) -> None:
        if key not in self.store:
            self.store[key] = []
        self.store[key].append([timestamp, value])

    def get(self, key: str, timestamp: int) -> str:
        entries = self.store.get(key, [])
        result = ""

        l, r = 0, len(entries) - 1
        while l <= r:
            m = l + (r - l) // 2
            if entries[m][0] <= timestamp:
                result = entries[m][1]   # valid — but something newer may exist
                l = m + 1
            else:
                r = m - 1                # too new, look earlier

        return result
```

**`set`:** `O(1)`  ·  **`get`:** `O(log n)`  ·  **Space:** `O(n)`

### The "keep the best candidate" pattern

Plain binary search returns as soon as it hits an exact match. Here there may be no exact match — `get("alice", 2)` must return the value set at time `1`. So instead of returning early, every time you find a *valid* entry you save it and keep searching right for a better one. When the loop ends, `result` holds the newest valid value, or `""` if you never found one.

This same shape solves "largest value `<=` x", "smallest value `>=` x", "insertion point", and "first/last occurrence in a list with duplicates". It is worth learning as its own template alongside exact-match binary search.

---

## 3. Using `bisect`

The standard library has the boundary search built in. `bisect_right` returns the insertion point *after* any equal entries, so `i - 1` is exactly the rightmost entry with timestamp `<= timestamp`.

```python
class TimeMap:
    def __init__(self):
        self.store = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.store.setdefault(key, []).append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        entries = self.store.get(key, [])
        i = bisect.bisect_right(entries, (timestamp, chr(127)))
        return entries[i - 1][1] if i else ""
```

**`set`:** `O(1)`  ·  **`get`:** `O(log n)`  ·  **Space:** `O(n)`

The `chr(127)` sentinel makes the search key sort after any real `(timestamp, value)` pair with the same timestamp, so entries at exactly `timestamp` are included. Write the explicit loop in an interview — but knowing `bisect` exists is worth it for real code.
