## 1. Recursion

At each house, either rob it and skip the next, or skip it and move on.

```python
class Solution:
    def rob(self, nums: List[int]) -> int:
        def best(i: int) -> int:
            if i >= len(nums):
                return 0
            return max(nums[i] + best(i + 2), best(i + 1))

        return best(0)
```

**Time complexity:** `O(2^n)`  ·  **Space complexity:** `O(n)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Memoization (Top-Down)

```python
class Solution:
    def rob(self, nums: List[int]) -> int:
        memo = {}

        def best(i: int) -> int:
            if i >= len(nums):
                return 0
            if i in memo:
                return memo[i]
            memo[i] = max(nums[i] + best(i + 2), best(i + 1))
            return memo[i]

        return best(0)
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 3. Bottom-Up (Tabulation)

`dp[i]` is the most you can steal from the first `i + 1` houses.

```python
class Solution:
    def rob(self, nums: List[int]) -> int:
        n = len(nums)
        if n == 1:
            return nums[0]

        dp = [0] * n
        dp[0] = nums[0]
        dp[1] = max(nums[0], nums[1])

        for i in range(2, n):
            dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])

        return dp[n - 1]
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)`

---

## 4. Two Variables

```python
class Solution:
    def rob(self, nums: List[int]) -> int:
        rob1, rob2 = 0, 0           # best up to i-2, best up to i-1

        for n in nums:
            rob1, rob2 = rob2, max(rob2, rob1 + n)

        return rob2
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

### Why this version needs no base cases

Starting both variables at `0` handles the empty array, the single-house array, and everything else without a special case. `rob2` always holds "the best answer for the houses seen so far", and `rob1` holds "the best answer ignoring the most recent house" — which is exactly what you are allowed to add to when you rob the current one. Getting the *meaning* of your variables precise is what removes the edge cases.

### Why greedy fails

Worth being able to say out loud in an interview. On `[2,9,8,3,6]`, the greedy
rule "always take the biggest remaining house" grabs `9` first. That immediately
forbids its neighbours `2` and `8`, leaving only `3` and `6` — of which just one
more is reachable, for `9 + 6 = 15`.

The DP instead finds `2 + 8 + 6 = 16` by taking three smaller houses.

Greedy loses because taking `9` is locally attractive but destroys access to two
houses worth `10` between them. That is the signature of a problem that needs
DP: a choice's cost is not visible when you make it, so you have to compare
*complete plans* rather than individual numbers.
