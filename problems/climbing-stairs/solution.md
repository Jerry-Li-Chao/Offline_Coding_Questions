## 1. Recursion

Translate the recurrence directly. Each call branches into "took one step" and "took two steps".

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        def count(i: int) -> int:
            if i >= n:
                return 1 if i == n else 0
            return count(i + 1) + count(i + 2)

        return count(0)
```

**Time complexity:** `O(2^n)`  ·  **Space complexity:** `O(n)` for the call stack

Correct, but it recomputes the same `count(i)` over and over — this is the picture of the problem, not the solution.

---

## 2. Memoization (Top-Down)

Same recursion, but remember each answer the first time you compute it. The tree of calls collapses into `n` distinct subproblems.

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        memo = {}

        def count(i: int) -> int:
            if i >= n:
                return 1 if i == n else 0
            if i in memo:
                return memo[i]
            memo[i] = count(i + 1) + count(i + 2)
            return memo[i]

        return count(0)
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 3. Bottom-Up (Tabulation)

Build the answers upward instead of recursing downward. `dp[i]` is the number of ways to reach step `i`.

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        dp = [0] * (n + 1)
        dp[0] = 1
        dp[1] = 1

        for i in range(2, n + 1):
            dp[i] = dp[i - 1] + dp[i - 2]

        return dp[n]
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 4. Two Variables

`dp[i]` only ever reads `dp[i - 1]` and `dp[i - 2]`, so the whole array is wasted memory. Keep two rolling values.

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        one, two = 1, 1

        for _ in range(n - 1):
            one, two = one + two, one

        return one
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

### The pattern

Every 1-D DP problem in this section follows the same four-step arc, and it is worth doing consciously each time:

1. **Find the recurrence.** What are the last choices that could have led here?
2. **Memoize it.** Cache subproblem answers — that alone kills the exponential.
3. **Flip it bottom-up.** Fill a table in dependency order instead of recursing.
4. **Shrink the state.** If `dp[i]` reads only a fixed window behind it, replace the array with that many variables.

You do not have to reach step 4 to have a correct solution — but noticing that the window is small is what turns `O(n)` space into `O(1)`.

### Why `ways(0) = 1`

It reads oddly, but "there is exactly one way to have gone nowhere" is what makes the recurrence produce the right counts. If you set it to `0`, every answer collapses to zero. Base cases in DP are chosen to make the recurrence come out right, not by intuition about the story.
