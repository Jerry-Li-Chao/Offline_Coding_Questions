## Reframing the Problem

Two observations turn this into a standard subset-sum question:

1. If the total is **odd**, no equal split exists. Return `false` immediately.
2. Otherwise each half must sum to `total // 2`. You only need to find **one** subset hitting that target — the complement necessarily hits it too.

So: *is there a subset of `nums` that sums to `total // 2`?*

---

## 1. Recursion

For each number, either include it in the subset or skip it.

```python
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2

        def reachable(i: int, remaining: int) -> bool:
            if remaining == 0:
                return True
            if i == len(nums) or remaining < 0:
                return False
            return (reachable(i + 1, remaining - nums[i])   # take nums[i]
                    or reachable(i + 1, remaining))         # skip it

        return reachable(0, target)
```

**Time complexity:** `O(2^n)`  ·  **Space complexity:** `O(n)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Reachable Sums with a Set

The shortest correct solution. Keep every sum you can currently build; each new number doubles the possibilities, but the set collapses duplicates.

```python
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2

        sums = {0}
        for n in nums:
            sums |= {s + n for s in sums if s + n <= target}
            if target in sums:
                return True

        return target in sums
```

**Time complexity:** `O(n * target)`  ·  **Space complexity:** `O(target)`

Capping at `<= target` is what keeps the set bounded — without it the set grows toward `2^n` entries and the complexity claim is false.

---

## 3. Bottom-Up Boolean Table

The classic formulation. `dp[a]` is `True` when some subset sums to exactly `a`.

```python
class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2

        dp = [False] * (target + 1)
        dp[0] = True                        # the empty subset sums to 0

        for n in nums:
            for a in range(target, n - 1, -1):     # iterate DOWNWARD
                dp[a] = dp[a] or dp[a - n]

        return dp[target]
```

**Time complexity:** `O(n * target)`  ·  **Space complexity:** `O(target)`

### Why the inner loop runs downward

This is the single most important detail, and it is what separates this problem from *Coin Change*.

Each number may be used **at most once**. Iterating `a` upward would let `dp[a - n]` already reflect the current `n` being used, so the same number could be counted twice — `[3]` with `target = 6` would wrongly report `True`.

Going downward guarantees `dp[a - n]` still holds the value from *before* `n` was considered, so each number contributes to each sum at most once.

| Problem | Each item usable | Inner loop |
| --- | --- | --- |
| Coin Change | unlimited times | forward |
| Partition Equal Subset Sum | once | backward |

That one-line difference is the whole distinction between the **unbounded** and **0/1** knapsack families. If you remember nothing else from this problem, remember the loop direction.

### Why checking one subset is enough

If a subset sums to `total / 2`, everything not in it sums to `total - total / 2`, which is the same number. So proving one half exists proves both — no need to construct or verify the second subset.
