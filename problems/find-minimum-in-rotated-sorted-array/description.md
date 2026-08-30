An array of length `n` sorted in ascending order is **rotated** between `1` and `n` times. Rotating `[1,2,3,4,5,6]` four times, for example, gives `[3,4,5,6,1,2]`.

You are given such a rotated array `nums` containing **unique** elements. Return the **minimum** value in it.

Your solution must run in `O(log n)` time.

---

### Example 1

```
Input: nums = [3,4,5,6,1,2]

Output: 1
```

### Example 2

```
Input: nums = [4,5,0,1,2,3]

Output: 0
```

### Example 3

```
Input: nums = [4,5,6,7]

Output: 4
```

---

### Constraints

- `1 <= nums.length <= 5000`
- `-5000 <= nums[i] <= 5000`
- All integers in `nums` are unique.

---

### Hints

<details>
<summary>Hint 1</summary>

A rotated sorted array is made of **two sorted runs**, and every value in the left run is larger than every value in the right run. The minimum is the first element of the right run — the single place where the array "drops".

</details>

<details>
<summary>Hint 2</summary>

Compare `nums[mid]` against `nums[right]` rather than `nums[left]`. If `nums[mid] > nums[right]`, the drop must be somewhere to the right of `mid`, so search `[mid + 1, right]`. Otherwise `mid` might itself be the minimum, so search `[left, mid]` — note you keep `mid` this time.

</details>

<details>
<summary>Hint 3</summary>

Because one side of the range always keeps `mid` as a candidate, use `while l < r` (not `l <= r`) and return `nums[l]` when the range collapses to a single element. This variant never needs a separate "found it" check, and it handles the not-actually-rotated case (`[4,5,6,7]`) for free.

</details>
