## 1. Brute Force

Check every cell. Correct, but it throws away both sorted guarantees.

```python
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        for row in matrix:
            for value in row:
                if value == target:
                    return True
        return False
```

**Time complexity:** `O(m * n)`  ·  **Space complexity:** `O(1)`

---

## 2. Binary Search on the Row, Then in the Row

First narrow to the one row whose range can contain `target`, then binary search that row.

```python
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        rows, cols = len(matrix), len(matrix[0])

        top, bot = 0, rows - 1
        while top <= bot:
            mid = top + (bot - top) // 2
            if target > matrix[mid][-1]:
                top = mid + 1
            elif target < matrix[mid][0]:
                bot = mid - 1
            else:
                break

        if top > bot:
            return False

        row = top + (bot - top) // 2
        l, r = 0, cols - 1
        while l <= r:
            m = l + (r - l) // 2
            if matrix[row][m] > target:
                r = m - 1
            elif matrix[row][m] < target:
                l = m + 1
            else:
                return True
        return False
```

**Time complexity:** `O(log m + log n)`  ·  **Space complexity:** `O(1)`

---

## 3. One Binary Search Over the Flattened Array

The cleanest version. Because the rows chain together, the whole matrix behaves like one sorted array of length `m * n`. Search that index range and convert back to a cell only when you need to read a value.

```python
class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        rows, cols = len(matrix), len(matrix[0])

        l, r = 0, rows * cols - 1
        while l <= r:
            m = l + (r - l) // 2
            value = matrix[m // cols][m % cols]
            if value > target:
                r = m - 1
            elif value < target:
                l = m + 1
            else:
                return True

        return False
```

**Time complexity:** `O(log(m * n))`  ·  **Space complexity:** `O(1)`

### The index trick

For a flat index `m` in a matrix with `cols` columns:

- `m // cols` is the row (how many full rows fit before it)
- `m % cols` is the column (how far into that row it sits)

This is worth internalizing — it turns any "sorted grid" into an ordinary binary search, and it shows up again in problems that flatten or reshape arrays.
