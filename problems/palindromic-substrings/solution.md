## 1. Brute Force

```python
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0
        for i in range(len(s)):
            for j in range(i, len(s)):
                sub = s[i:j + 1]
                if sub == sub[::-1]:
                    count += 1
        return count
```

**Time complexity:** `O(n^3)`  ·  **Space complexity:** `O(n)`

---

## 2. Expand Around Centre

Identical machinery to *Longest Palindromic Substring* — only the bookkeeping changes. Every time the two pointers still match, you have found one more palindrome, so count it right there.

```python
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0

        def expand(l: int, r: int) -> None:
            nonlocal count
            while l >= 0 and r < len(s) and s[l] == s[r]:
                count += 1          # every successful expansion is a palindrome
                l -= 1
                r += 1

        for i in range(len(s)):
            expand(i, i)            # odd length
            expand(i, i + 1)        # even length

        return count
```

**Time complexity:** `O(n^2)`  ·  **Space complexity:** `O(1)`

### Why the increment goes inside the loop

Each iteration of the `while` confirms a distinct palindrome, one character wider than the last. Expanding from centre `i` in `"aaa"` walks `"a"` then `"aaa"` — two palindromes from one centre. Counting once per *centre* instead of once per *expansion step* is the classic bug here, and it produces `2n - 1` for every input.

---

## 3. Dynamic Programming

The table version, for when you also need to know *which* ranges are palindromic.

```python
class Solution:
    def countSubstrings(self, s: str) -> int:
        n = len(s)
        dp = [[False] * n for _ in range(n)]
        count = 0

        for i in range(n - 1, -1, -1):          # fill bottom-up by start index
            for j in range(i, n):
                if s[i] == s[j] and (j - i < 2 or dp[i + 1][j - 1]):
                    dp[i][j] = True
                    count += 1

        return count
```

**Time complexity:** `O(n^2)`  ·  **Space complexity:** `O(n^2)`

### The fill order

`dp[i][j]` depends on `dp[i + 1][j - 1]` — one row *below*, one column *left*. Iterating `i` downward and `j` upward guarantees that entry is already computed. Get the loop direction backwards and you read uninitialized `False` values, which silently undercounts instead of crashing.

`j - i < 2` covers the one- and two-character cases, which have no interior to check.

### Relationship to the previous problem

These two problems are the same algorithm with different accumulators — `max` versus `+= 1`. Recognising that saves you from re-deriving anything: solve one, and the other is a two-line change.
