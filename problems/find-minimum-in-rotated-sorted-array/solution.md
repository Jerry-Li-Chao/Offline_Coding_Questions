## 1. Brute Force

```python
class Solution:
    def findMin(self, nums: List[int]) -> int:
        smallest = nums[0]
        for n in nums:
            smallest = min(smallest, n)
        return smallest
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

---

## 2. Binary Search

Picture the array as two descending "staircases": a left run of large values, then a drop, then a right run of small values. The minimum sits exactly at the drop.

The trick is choosing what to compare `nums[mid]` against. Comparing with **`nums[r]`** answers the question directly: *am I in the left run or the right run?*

- `nums[mid] > nums[r]` → `mid` is in the left (high) run, so the drop is strictly right of `mid`.
- `nums[mid] <= nums[r]` → `mid` is in the right (low) run, so the drop is at `mid` or to its left.

```python
class Solution:
    def findMin(self, nums: List[int]) -> int:
        l, r = 0, len(nums) - 1

        while l < r:
            m = l + (r - l) // 2
            if nums[m] > nums[r]:
                l = m + 1      # minimum is strictly right of m
            else:
                r = m          # m could be the minimum — keep it

        return nums[l]
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(1)`

### Why `l < r` and not `l <= r`?

In the plain Binary Search problem the loop looks for an exact match, so it must examine a single-element range — hence `l <= r`. Here the loop is *narrowing toward* an answer instead: the `else` branch sets `r = m`, keeping `m` in the range. When `l == r` the range holds exactly one candidate and it is the answer, so continuing would loop forever. `l < r` with `return nums[l]` is the standard shape for this "find the boundary" flavor of binary search.

### Why compare against `nums[r]` and not `nums[l]`?

Comparing with `nums[l]` also works, but needs an extra guard for the already-sorted case: in `[4,5,6,7]`, `nums[mid] > nums[l]` is true even though the minimum is at index `0`, so you would wrongly search right. Comparing against `nums[r]` gives `nums[mid] <= nums[r]` there, which correctly moves left. One comparison, no special case.

---

## 3. Recursive Variant

Same logic, if you prefer to see it written as a recurrence.

```python
class Solution:
    def findMin(self, nums: List[int]) -> int:
        def helper(l: int, r: int) -> int:
            if l == r:
                return nums[l]
            m = l + (r - l) // 2
            if nums[m] > nums[r]:
                return helper(m + 1, r)
            return helper(l, m)

        return helper(0, len(nums) - 1)
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(log n)` for the recursion stack
