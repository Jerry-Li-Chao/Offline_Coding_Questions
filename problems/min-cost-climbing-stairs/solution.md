## 1. Recursion

Define `reach(i)` as the cheapest way to arrive at position `i`. You got there from `i - 1` or `i - 2`, paying that stair's cost to leave.

```python
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        def reach(i: int) -> int:
            if i <= 1:
                return 0            # starting on stair 0 or 1 is free
            return min(reach(i - 1) + cost[i - 1],
                       reach(i - 2) + cost[i - 2])

        return reach(len(cost))
```

**Time complexity:** `O(2^n)`  ·  **Space complexity:** `O(n)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Memoization (Top-Down)

```python
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        memo = {}

        def reach(i: int) -> int:
            if i <= 1:
                return 0
            if i in memo:
                return memo[i]
            memo[i] = min(reach(i - 1) + cost[i - 1],
                          reach(i - 2) + cost[i - 2])
            return memo[i]

        return reach(len(cost))
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 3. Bottom-Up (Tabulation)

```python
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        n = len(cost)
        dp = [0] * (n + 1)          # dp[i] = cheapest way to reach position i

        for i in range(2, n + 1):
            dp[i] = min(dp[i - 1] + cost[i - 1],
                        dp[i - 2] + cost[i - 2])

        return dp[n]
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

Note the table has `n + 1` entries. Position `n` is the ground past the last stair — the place you are actually trying to reach.

---

## 4. Two Variables

```python
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        prev, curr = 0, 0           # cost to reach i-2 and i-1

        for i in range(2, len(cost) + 1):
            prev, curr = curr, min(curr + cost[i - 1], prev + cost[i - 2])

        return curr
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

### The off-by-one that bites everyone

`cost[i]` is the price of **leaving** stair `i`, not of standing on it. So:

- The answer is `dp[n]`, not `dp[n - 1]`. Returning `dp[n - 1]` means stopping on the last stair rather than climbing past it, and quietly gives the wrong answer on inputs like `[1, 100]` — the real answer is `1` (start at `0`, pay `1`, jump two), but `dp[n - 1]` gives `0`.
- `dp[0]` and `dp[1]` are both `0` because starting on either stair costs nothing. You only pay when you leave.

### Building it backwards instead

Some people find it easier to define `dp[i]` as "cheapest way to get from stair `i` to the top", filling right to left:

```python
class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        dp = cost + [0, 0]

        for i in range(len(cost) - 1, -1, -1):
            dp[i] += min(dp[i + 1], dp[i + 2])

        return min(dp[0], dp[1])
```

Both directions are equally valid. Pick whichever base case you find easier to state without second-guessing.
