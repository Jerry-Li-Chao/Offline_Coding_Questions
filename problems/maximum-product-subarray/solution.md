## 1. Brute Force

```python
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = nums[0]
        for i in range(len(nums)):
            product = 1
            for j in range(i, len(nums)):
                product *= nums[j]
                best = max(best, product)
        return best
```

**Time complexity:** `O(n^2)`  ·  **Space complexity:** `O(1)`

---

## 2. Track Both Extremes

The single-pass version. The insight is that a running **minimum** is worth keeping, because multiplying by a negative turns the smallest product into the largest.

```python
class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = nums[0]
        cur_max, cur_min = 1, 1

        for n in nums:
            candidates = (n, cur_max * n, cur_min * n)
            cur_max, cur_min = max(candidates), min(candidates)
            best = max(best, cur_max)

        return best
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

### Why you must track the minimum

Consider `[-2, 3, -4]`. Tracking only the maximum:

| i | value | max ending here (naive) |
| --- | --- | --- |
| 0 | `-2` | `-2` |
| 1 | `3` | `3` |
| 2 | `-4` | `-4` |

That reports `3`. But the true answer is `24`, from the whole array: `-2 * 3 * -4`.

Tracking both:

| i | value | max ending here | min ending here |
| --- | --- | --- | --- |
| 0 | `-2` | `-2` | `-2` |
| 1 | `3` | `3` | `-6` |
| 2 | `-4` | `24` | `-12` |

The `-6` at index 1 looked worthless. Multiplied by `-4` it became the answer. **A minimum is a maximum waiting for a negative.**

### Why `n` itself is one of the candidates

Including the bare `n` lets a subarray *restart* at the current element. This matters most for zeros: after a `0`, both running products are `0`, and without the bare-`n` candidate every later product would stay stuck at `0`. On `[0, 2, 3]`, the restart is what produces `6`.

### Why `best` starts at `nums[0]` and not `0`

The subarray must be non-empty. On an input like `[-3]` the answer is `-3`, but a `best` initialized to `0` would wrongly report `0` — a product of no elements. Seeding with an actual element keeps every reported answer achievable.

### Relationship to Kadane's algorithm

This is the multiplicative sibling of maximum-subarray-*sum*. The sum version needs only a running maximum, because adding a negative always makes things worse. Multiplication has a sign flip, so the state doubles from one value to two. When a DP recurrence seems to fail, the fix is often "carry more state", not "abandon the approach".
