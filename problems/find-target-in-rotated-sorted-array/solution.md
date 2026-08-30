## 1. Brute Force

```python
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        for i, n in enumerate(nums):
            if n == target:
                return i
        return -1
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

---

## 2. Binary Search on the Sorted Half

The array is not sorted overall, so `nums[mid] < target` no longer tells you which direction to go. The insight that rescues binary search:

> Split a rotated sorted array anywhere, and **at least one half is properly sorted**.

The rotation point can only fall in one half, so the other half is a clean ascending run. Within a sorted half you *can* decide membership with simple range comparisons — so each step: find the sorted half, ask whether `target` lives in it, and discard the half that cannot contain it.

```python
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        l, r = 0, len(nums) - 1

        while l <= r:
            m = l + (r - l) // 2
            if nums[m] == target:
                return m

            if nums[l] <= nums[m]:
                # left half [l, m] is sorted
                if nums[l] <= target < nums[m]:
                    r = m - 1
                else:
                    l = m + 1
            else:
                # right half [m, r] is sorted
                if nums[m] < target <= nums[r]:
                    l = m + 1
                else:
                    r = m - 1

        return -1
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(1)`

### Getting the boundaries right

The two range checks are where this problem is usually lost.

- `nums[l] <= target < nums[m]` — `nums[l]` is included because `l` is still a live candidate. `nums[m]` is excluded because we already checked it for equality and returned.
- `nums[m] < target <= nums[r]` — mirror image: `m` is excluded for the same reason, `r` is included.

The `<=` in `nums[l] <= nums[m]` also matters. When the range narrows to two elements, `m == l`, and `nums[l] <= nums[m]` is trivially true — correctly classifying the single-element left half as sorted. With a strict `<` that case falls into the wrong branch.

---

## 3. Two-Pass: Find the Pivot, Then Search

If the combined logic feels fiddly, you can split the work: locate the rotation point (the same binary search as *Find Minimum in Rotated Sorted Array*), then run an ordinary binary search on whichever run can contain `target`.

```python
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        # 1. find the index of the smallest value — the rotation point
        l, r = 0, len(nums) - 1
        while l < r:
            m = l + (r - l) // 2
            if nums[m] > nums[r]:
                l = m + 1
            else:
                r = m
        pivot = l

        # 2. plain binary search on the run that can contain target
        def binary(l: int, r: int) -> int:
            while l <= r:
                m = l + (r - l) // 2
                if nums[m] > target:
                    r = m - 1
                elif nums[m] < target:
                    l = m + 1
                else:
                    return m
            return -1

        left = binary(0, pivot - 1)
        return left if left != -1 else binary(pivot, len(nums) - 1)
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(1)`

Two passes of `O(log n)` is still `O(log n)`. This version is longer but each half is a binary search you already know, which makes it much easier to reason about under interview pressure.
