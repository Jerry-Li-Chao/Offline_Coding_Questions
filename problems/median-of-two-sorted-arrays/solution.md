## 1. Merge Both Arrays

Always worth writing first — it is obviously correct and gives you something to test the fast version against.

```python
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        merged = sorted(nums1 + nums2)
        n = len(merged)
        mid = n // 2
        if n % 2:
            return float(merged[mid])
        return (merged[mid - 1] + merged[mid]) / 2
```

**Time complexity:** `O((m + n) log(m + n))`  ·  **Space complexity:** `O(m + n)`

Using a two-pointer merge instead of `sorted` brings this to `O(m + n)` time, still with `O(m + n)` space.

---

## 2. Binary Search on the Partition

The `O(log)` solution never merges anything. Instead, imagine cutting each array into a left part and a right part:

```
nums1:  A A A A | B B B
nums2:      C C | D D D D
```

If the two left parts together hold exactly half the elements, and **every value on the left is `<=` every value on the right**, then you are looking straight at the median — it is built from the values touching the cut.

Two more observations turn this into a search:

1. Once you decide to take `i` elements from `nums1`, the number from `nums2` is forced: `j = half - i`. So there is only **one** unknown.
2. As `i` grows, `left1` grows and `right2` shrinks — monotonic, so binary search applies.

Search `i` over the **shorter** array so the range stays small and `j` never goes out of bounds.

```python
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        A, B = nums1, nums2
        if len(A) > len(B):
            A, B = B, A                       # always binary search the shorter one

        total = len(A) + len(B)
        half = total // 2

        l, r = 0, len(A)
        while True:
            i = l + (r - l) // 2              # elements taken from A
            j = half - i                      # elements taken from B

            left1  = A[i - 1] if i > 0 else float("-inf")
            right1 = A[i]     if i < len(A) else float("inf")
            left2  = B[j - 1] if j > 0 else float("-inf")
            right2 = B[j]     if j < len(B) else float("inf")

            if left1 <= right2 and left2 <= right1:
                if total % 2:
                    return float(min(right1, right2))
                return (max(left1, left2) + min(right1, right2)) / 2
            if left1 > right2:
                r = i - 1                     # took too much from A
            else:
                l = i + 1                     # took too little from A
```

**Time complexity:** `O(log(min(m, n)))`  ·  **Space complexity:** `O(1)`

### Reading the four boundary values

| Name | Meaning |
| --- | --- |
| `left1` | last element on `A`'s left side |
| `right1` | first element on `A`'s right side |
| `left2` | last element on `B`'s left side |
| `right2` | first element on `B`'s right side |

The cut is valid when `left1 <= right2` **and** `left2 <= right1`. Each array is internally sorted already, so those two cross-checks are all that is needed to prove *everything* on the left is `<=` everything on the right.

### Why the infinities

When `i == 0` there is nothing on `A`'s left, so `left1` should never block a valid cut — `-inf` makes `left1 <= right2` automatically true. Symmetrically, `right1 = +inf` when the cut is past the end of `A`. This removes every empty-array and edge-of-range special case, including `nums1 = []`.

### Why `half = total // 2` works for both parities

For an even total, the left side holds exactly half and the median averages the two values at the cut. For an odd total, integer division puts the extra element on the **right** side, so the median is simply the smaller of the two right-side values, `min(right1, right2)`. One formula, no separate case analysis.
