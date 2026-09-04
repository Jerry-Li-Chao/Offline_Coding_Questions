## 1. Recursion

At each index, try consuming one digit, then try consuming two.

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        def ways(i: int) -> int:
            if i == len(s):
                return 1                    # decoded everything — one valid way
            if s[i] == "0":
                return 0                    # no piece may start with 0

            total = ways(i + 1)
            if i + 1 < len(s) and (s[i] == "1" or (s[i] == "2" and s[i + 1] < "7")):
                total += ways(i + 2)
            return total

        return ways(0)
```

**Time complexity:** `O(2^n)`  ·  **Space complexity:** `O(n)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Memoization (Top-Down)

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        memo = {len(s): 1}

        def ways(i: int) -> int:
            if i in memo:
                return memo[i]
            if s[i] == "0":
                memo[i] = 0
                return 0

            total = ways(i + 1)
            if i + 1 < len(s) and (s[i] == "1" or (s[i] == "2" and s[i + 1] < "7")):
                total += ways(i + 2)

            memo[i] = total
            return total

        return ways(0)
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 3. Bottom-Up (Tabulation)

Fill right to left so both `dp[i + 1]` and `dp[i + 2]` are ready when you need them.

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        n = len(s)
        dp = [0] * (n + 1)
        dp[n] = 1                           # empty suffix: one way

        for i in range(n - 1, -1, -1):
            if s[i] == "0":
                dp[i] = 0
                continue
            dp[i] = dp[i + 1]
            if i + 1 < n and (s[i] == "1" or (s[i] == "2" and s[i + 1] < "7")):
                dp[i] += dp[i + 2]

        return dp[0]
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 4. Two Variables

```python
class Solution:
    def numDecodings(self, s: str) -> int:
        n = len(s)
        after_one, after_two = 1, 0         # dp[i+1], dp[i+2]

        for i in range(n - 1, -1, -1):
            if s[i] == "0":
                current = 0
            else:
                current = after_one
                if i + 1 < n and (s[i] == "1" or (s[i] == "2" and s[i + 1] < "7")):
                    current += after_two
            after_one, after_two = current, after_one

        return after_one
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

### The zero rules, precisely

Zeros are where this problem is won or lost.

- **A piece never starts with `'0'`.** `"06"` is not `'F'`. So if `s[i] == '0'`, the suffix at `i` has zero decodings — full stop.
- **A `'0'` is only ever decodable as the second half of `"10"` or `"20"`.** The code above gets this for free: `dp[i]` at the zero is `0`, but the two-digit branch from `i - 1` skips over it entirely.
- `"100"` is `0`, not `1`. The `"10"` decodes fine, but the trailing `"0"` cannot be decoded on its own and nothing can pair with it.

### The two-digit validity check

`s[i] == "1" or (s[i] == "2" and s[i + 1] < "7")` is just `10 <= int(s[i:i+2]) <= 26` without the conversion. Any two-digit piece starting with `'1'` is `10`–`19`, all valid. Starting with `'2'` it is valid only through `26`, and since these are single characters, `s[i + 1] < "7"` compares them correctly by ASCII order.

### Why the empty suffix is `1`

Same reasoning as `ways(0) = 1` in Climbing Stairs: reaching the end means you made a complete, valid set of choices, and that counts as exactly one decoding. Set it to `0` and every answer collapses to zero.
