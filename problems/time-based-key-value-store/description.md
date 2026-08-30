Design a key-value store where each key can hold **multiple values at different timestamps**, and a lookup retrieves the value as of a given moment in time.

Implement the `TimeMap` class:

- `TimeMap()` — initializes the store.
- `set(key: str, value: str, timestamp: int) -> None` — stores `value` under `key` at time `timestamp`.
- `get(key: str, timestamp: int) -> str` — returns the value that was set for `key` at the **largest timestamp less than or equal to** `timestamp`. If no such value exists, return the empty string `""`.

You may assume every call to `set` for a given key uses a **strictly increasing** `timestamp`.

---

### Example

```
Input:
["TimeMap", "set", "get", "get", "set", "get", "get"]
[[], ["alice", "happy", 1], ["alice", 1], ["alice", 2], ["alice", "sad", 3], ["alice", 3], ["alice", 2]]

Output: [null, null, "happy", "happy", null, "sad", "happy"]
```

Explanation:

- `set("alice", "happy", 1)` stores `"happy"` at time `1`.
- `get("alice", 1)` → `"happy"` — exact timestamp match.
- `get("alice", 2)` → `"happy"` — the newest value at or before time `2`.
- `set("alice", "sad", 3)` stores `"sad"` at time `3`.
- `get("alice", 3)` → `"sad"`.
- `get("alice", 2)` → `"happy"` — time `2` is still before `"sad"` was set.

---

### Constraints

- `1 <= key.length, value.length <= 100`
- `key` and `value` consist of lowercase English letters and digits.
- `1 <= timestamp <= 1000`
- At most `2000` calls are made to `set` and `get` combined.

---

### Hints

<details>
<summary>Hint 1</summary>

Keep a dictionary from `key` to a list of `[timestamp, value]` entries. Because timestamps arrive strictly increasing, each of those lists is **already sorted** — you never have to sort anything.

</details>

<details>
<summary>Hint 2</summary>

`get` is then a search inside one sorted list: find the **rightmost** entry whose timestamp is `<= timestamp`. That is binary search, not a scan.

</details>

<details>
<summary>Hint 3</summary>

This is the "find the boundary" flavor rather than the "find an exact match" flavor. Track the best answer you have seen: when `entries[m][0] <= timestamp`, record `entries[m][1]` as a candidate and keep searching **right** for something newer; otherwise search left.

</details>
