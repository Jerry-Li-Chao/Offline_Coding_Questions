You are given an array of integers `nums` that is **sorted in ascending order** and contains no duplicate values, along with an integer `target`.

Return the **index** of `target` inside `nums`. If `target` is not present in the array, return `-1`.

Your solution must run in `O(log n)` time.

---

### Example 1

```
Input: nums = [-1,0,2,4,6,8], target = 4

Output: 3
```

### Example 2

```
Input: nums = [-1,0,2,4,6,8], target = 3

Output: -1
```

---

### Constraints

- `1 <= nums.length <= 10000`
- `-10000 < nums[i], target < 10000`
- All integers in `nums` are **unique** and sorted in ascending order.

---

### Hints

<details>
<summary>Hint 1</summary>

Can you take advantage of the fact that the array is sorted? A linear scan is `O(n)` — the sorted order lets you throw away half of the remaining search space on every comparison.

</details>

<details>
<summary>Hint 2</summary>

Keep two pointers, `l` and `r`, marking the inclusive bounds of the region that could still contain `target`. Look at the middle element `m`. If `nums[m] < target`, everything at or left of `m` is too small, so move `l = m + 1`. If `nums[m] > target`, move `r = m - 1`. Otherwise you found it.

</details>

<details>
<summary>Hint 3</summary>

Computing the midpoint as `l + (r - l) // 2` instead of `(l + r) // 2` avoids integer overflow in languages with fixed-width ints. The loop should continue while `l <= r` — using `<` would skip the case where one element remains.

</details>
