## 1. Recursion

Try every coin as the last one placed.

```python
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        def fewest(remaining: int) -> float:
            if remaining == 0:
                return 0
            if remaining < 0:
                return float("inf")
            return min((1 + fewest(remaining - c) for c in coins),
                       default=float("inf"))

        result = fewest(amount)
        return -1 if result == float("inf") else result
```

**Time complexity:** `O(len(coins) ^ amount)`  ·  **Space complexity:** `O(amount)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Memoization (Top-Down)

```python
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        memo = {0: 0}

        def fewest(remaining: int) -> float:
            if remaining < 0:
                return float("inf")
            if remaining in memo:
                return memo[remaining]

            best = float("inf")
            for c in coins:
                best = min(best, 1 + fewest(remaining - c))

            memo[remaining] = best
            return best

        result = fewest(amount)
        return -1 if result == float("inf") else result
```

**Time complexity:** `O(amount * len(coins))`  ·  **Space complexity:** `O(amount)`

> **This will fail the hidden tests with a `RecursionError`.** The complexity is
> right, but the call chain goes `amount` frames deep, and CPython's default
> limit is 1000 — the suite includes `amount = 10000`. Raising the limit with
> `sys.setrecursionlimit` patches over it; the bottom-up version below removes
> the problem entirely. Recursion depth is a real constraint on top-down DP in
> Python, and it is worth mentioning out loud in an interview.

---

## 3. Bottom-Up (Tabulation)

The version to write in an interview. `dp[a]` is the fewest coins that make exactly `a`.

```python
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        dp = [amount + 1] * (amount + 1)     # amount + 1 stands in for "impossible"
        dp[0] = 0

        for a in range(1, amount + 1):
            for c in coins:
                if c <= a:
                    dp[a] = min(dp[a], 1 + dp[a - c])

        return dp[amount] if dp[amount] <= amount else -1
```

**Time complexity:** `O(amount * len(coins))`  ·  **Space complexity:** `O(amount)`

### Why `amount + 1` works as infinity

Any real answer uses at most `amount` coins — even all-`1` coins take exactly `amount` of them. So `amount + 1` is unreachable by a genuine solution, which makes it a safe sentinel that keeps everything in plain integers. `float("inf")` works equally well; this just avoids mixing floats into an integer computation.

The final check must be `<= amount`, not `!= amount + 1`. Sums of sentinels can exceed `amount + 1`, so comparing against the exact value is fragile.

### Why greedy fails

Greedy is correct for real-world currencies (US coins, euros) because those systems are *canonical* — designed so the greedy choice is always optimal. This problem allows arbitrary denominations, which breaks that property.

With `coins = [1,3,4]`, `amount = 6`:

| Strategy | Coins used | Count |
| --- | --- | --- |
| Greedy | `4 + 1 + 1` | 3 |
| Optimal | `3 + 3` | 2 |

Taking the `4` looks best locally but leaves a remainder that only `1`s can fill. As in House Robber, a locally attractive choice poisons what comes after — so you must compare complete plans.

### This is the unbounded knapsack shape

Each coin may be reused any number of times, which is what makes the inner loop scan *all* coins at every amount. Compare with *Partition Equal Subset Sum*, where each number may be used at most once — a one-line change in the loop order, and a genuinely different problem.
