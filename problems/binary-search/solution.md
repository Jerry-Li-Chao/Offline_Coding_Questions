## 1. Brute Force

Scan every element and return the first index that matches. This ignores the sorted property entirely, so it is too slow for the required complexity — but it is a useful baseline to check your binary search against.

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

## 2. Binary Search (Recursive)

Search the inclusive range `[l, r]`. Compare `target` against the middle element and recurse into the half that can still contain it.

```python
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        def helper(l: int, r: int) -> int:
            if l > r:
                return -1
            m = l + (r - l) // 2
            if nums[m] == target:
                return m
            if nums[m] < target:
                return helper(m + 1, r)
            return helper(l, m - 1)

        return helper(0, len(nums) - 1)
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(log n)` for the recursion stack

---

## 3. Binary Search (Iterative)

The same idea without recursion. This is the version worth memorizing — the two details that trip people up are the `l <= r` loop condition and the overflow-safe midpoint.

```python
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        l, r = 0, len(nums) - 1

        while l <= r:
            m = l + (r - l) // 2
            if nums[m] > target:
                r = m - 1
            elif nums[m] < target:
                l = m + 1
            else:
                return m

        return -1
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(1)`

### Why `l <= r` and not `l < r`?

The invariant is that `[l, r]` is an **inclusive** range of still-possible indices. When `l == r` there is exactly one candidate left, and it still has to be checked. Stopping at `l < r` would return `-1` for single-element ranges, which breaks cases like `nums = [5], target = 5`.

### Why `l + (r - l) // 2`?

Mathematically it equals `(l + r) // 2`. Python integers are arbitrary precision so either works here, but in Java/C++ `l + r` can overflow a 32-bit `int` for large arrays. Writing it this way is the habit interviewers look for.

---

## 4. Using the Standard Library

Worth knowing, though an interviewer will usually ask you to implement it by hand.

```python
import bisect

class Solution:
    def search(self, nums: List[int], target: int) -> int:
        i = bisect.bisect_left(nums, target)
        return i if i < len(nums) and nums[i] == target else -1
```

**Time complexity:** `O(log n)`  ·  **Space complexity:** `O(1)`
