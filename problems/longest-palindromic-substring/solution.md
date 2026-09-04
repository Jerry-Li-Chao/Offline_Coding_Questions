## 1. Brute Force

Try every substring, check each one.

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        best = ""
        for i in range(len(s)):
            for j in range(i, len(s)):
                sub = s[i:j + 1]
                if sub == sub[::-1] and len(sub) > len(best):
                    best = sub
        return best
```

**Time complexity:** `O(n^3)`  ·  **Space complexity:** `O(n)`

---

## 2. Dynamic Programming

`dp[i][j]` is `True` when `s[i..j]` is a palindrome. The recurrence is the definition of a palindrome, written down:

> `s[i..j]` is a palindrome when `s[i] == s[j]` **and** the inside `s[i+1..j-1]` is a palindrome.

Fill the table by increasing length, so the inside is always solved before the outside.

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        dp = [[False] * n for _ in range(n)]
        start, longest = 0, 1

        for i in range(n):
            dp[i][i] = True                       # every single character

        for length in range(2, n + 1):
            for i in range(n - length + 1):
                j = i + length - 1
                if s[i] != s[j]:
                    continue
                if length == 2 or dp[i + 1][j - 1]:
                    dp[i][j] = True
                    if length > longest:
                        start, longest = i, length

        return s[start:start + longest]
```

**Time complexity:** `O(n^2)`  ·  **Space complexity:** `O(n^2)`

The `length == 2` case exists because a two-character palindrome has no inside to check — `dp[i+1][j-1]` would be an empty, backwards range.

---

## 3. Expand Around Centre

The same `O(n^2)` time with `O(1)` space, and much less code. Every palindrome has a centre; walk outward from each one.

```python
class Solution:
    def longestPalindrome(self, s: str) -> str:
        start, longest = 0, 0

        def expand(l: int, r: int) -> None:
            nonlocal start, longest
            while l >= 0 and r < len(s) and s[l] == s[r]:
                if r - l + 1 > longest:
                    start, longest = l, r - l + 1
                l -= 1
                r += 1

        for i in range(len(s)):
            expand(i, i)        # odd length, centred on one character
            expand(i, i + 1)    # even length, centred between two

        return s[start:start + longest]
```

**Time complexity:** `O(n^2)`  ·  **Space complexity:** `O(1)`

### The two kinds of centre

This is the detail people miss. `"racecar"` is centred on the `e` — a character. `"abba"` is centred *between* the two `b`s — a gap. Only checking single-character centres silently misses every even-length palindrome, and the bug is easy to overlook because odd-length test cases still pass.

There are `n` character centres and `n - 1` gap centres, so `2n - 1` calls in total, each expanding at most `O(n)` steps.

### Why this beats the DP table in practice

Both are `O(n^2)` time, but expand-around-centre uses `O(1)` space instead of `O(n^2)`, needs no careful fill order, and is far shorter to write correctly under pressure. The DP table is still worth understanding — it is the version that generalizes to *Palindromic Substrings* and to problems where you need every palindromic range, not just the longest.

There is an `O(n)` algorithm (Manacher's), but it is rarely expected in an interview.
