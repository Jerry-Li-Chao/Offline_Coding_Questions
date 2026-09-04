## 1. Recursion

At each position, try every dictionary word that matches there.

```python
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        def can_break(i: int) -> bool:
            if i == len(s):
                return True
            for w in wordDict:
                if s.startswith(w, i) and can_break(i + len(w)):
                    return True
            return False

        return can_break(0)
```

**Time complexity:** `O(len(wordDict) ^ n)`  ·  **Space complexity:** `O(n)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Memoization (Top-Down)

The same search, but each starting index is resolved once.

```python
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        memo = {len(s): True}

        def can_break(i: int) -> bool:
            if i in memo:
                return memo[i]
            memo[i] = any(s.startswith(w, i) and can_break(i + len(w))
                          for w in wordDict)
            return memo[i]

        return can_break(0)
```

**Time complexity:** `O(n * m * k)`  ·  **Space complexity:** `O(n)`

where `n = len(s)`, `m = len(wordDict)`, and `k` is the longest word length.

---

## 3. Bottom-Up (Tabulation)

```python
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        n = len(s)
        dp = [False] * (n + 1)
        dp[n] = True                        # empty suffix is always segmentable

        for i in range(n - 1, -1, -1):
            for w in wordDict:
                if i + len(w) <= n and s.startswith(w, i) and dp[i + len(w)]:
                    dp[i] = True
                    break

        return dp[0]
```

**Time complexity:** `O(n * m * k)`  ·  **Space complexity:** `O(n)`

### Why greedy fails

Take `s = "catsincars"` with `wordDict = ["cats","cat","sin","in","car"]`.

Greedily matching the longest word first picks `"cats"`, leaving `"incars"` → `"in"` → `"cars"`, which is not a word. A greedy algorithm reports `false` and stops.

Backtracking would then try `"cat"` → `"sin"` → `"cars"` — also stuck. Here the true answer *is* `false`, but the point stands: the first branch failing tells you nothing about the others. Change the dictionary to include `"cars"` and the greedy path succeeds while the other still fails. Only exploring every split gives a reliable answer, and memoization is what makes that affordable.

### Why fill right to left

`dp[i]` depends on `dp[i + len(w)]`, which is always to its *right*. Filling left to right would read entries that are still `False` because they have not been computed yet — producing a wrong `False` rather than an error, which is the hardest kind of bug to spot.

You can equally define `dp[i]` as "the **prefix** `s[:i]` is segmentable" and fill left to right; just be consistent about which direction your recurrence points.

### A faster membership check

Turning `wordDict` into a `set` and iterating over end positions instead of words changes the complexity profile:

```python
class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)
        longest = max(map(len, wordDict))
        n = len(s)

        dp = [False] * (n + 1)
        dp[0] = True                        # empty prefix

        for i in range(1, n + 1):
            for j in range(max(0, i - longest), i):
                if dp[j] and s[j:i] in words:
                    dp[i] = True
                    break

        return dp[n]
```

**Time complexity:** `O(n * k)` substring checks  ·  **Space complexity:** `O(n + total dictionary size)`

Capping the inner loop at `longest` avoids building substrings that could never be words — a small change that matters a lot when the dictionary is small but `s` is long.
