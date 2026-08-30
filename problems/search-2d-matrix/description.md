You are given an `m x n` two-dimensional integer array `matrix` with two guarantees:

- Every individual row is sorted in **ascending** order from left to right.
- The first integer of each row is **greater than** the last integer of the row above it.

Given an integer `target`, return `true` if `target` appears somewhere in `matrix`, and `false` otherwise.

Your solution must run in `O(log(m * n))` time.

---

### Example 1

```
Input: matrix = [[1,2,4,8],[10,11,12,13],[14,20,30,40]], target = 10

Output: true
```

### Example 2

```
Input: matrix = [[1,2,4,8],[10,11,12,13],[14,20,30,40]], target = 15

Output: false
```

---

### Constraints

- `1 <= m, n <= 100`
- `-10000 <= matrix[i][j], target <= 10000`

---

### Hints

<details>
<summary>Hint 1</summary>

The two guarantees together mean something strong: if you read the rows one after another, left to right, you get a **single sorted list** of all `m * n` values. A 2D shape is hiding a 1D sorted array.

</details>

<details>
<summary>Hint 2</summary>

One approach is two binary searches. First find the row whose range could contain `target` — the row where `matrix[i][0] <= target <= matrix[i][-1]`. Then binary search inside that one row. That is `O(log m + log n)`, which is the same as `O(log(m * n))`.

</details>

<details>
<summary>Hint 3</summary>

You can also do it with a **single** binary search over the flattened index range `[0, m * n - 1]`. Convert a flat index `i` back to a cell with `row = i // n` and `col = i % n`.

</details>
