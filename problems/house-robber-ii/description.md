You are a robber planning to rob houses along a street, where `nums[i]` is the amount of money in the `i`-th house.

This time the houses are arranged in a **circle** — the first and last houses are neighbours. As before, you may not rob two adjacent houses.

Return the maximum amount of money you can steal.

---

### Example 1

```
Input: nums = [3,4,3]

Output: 4
```

Explanation: robbing houses `0` and `2` would be `3 + 3 = 6`, but they are adjacent in the circle. The best legal plan is house `1` alone.

### Example 2

```
Input: nums = [2,9,8,3,6]

Output: 15
```

Explanation: rob houses `1` and `4` for `9 + 6 = 15`. Houses `0`, `2` and `4` would give `16`, but `0` and `4` are neighbours in the circle, so that plan is illegal.

---

### Constraints

- `1 <= nums.length <= 100`
- `0 <= nums[i] <= 100`

---

### Hints

<details>
<summary>Hint 1</summary>

Do not try to invent a circular recurrence. Instead, find a way to turn this into the linear problem you already solved.

</details>

<details>
<summary>Hint 2</summary>

The circle creates exactly **one** new constraint: you cannot take both the first and the last house. So consider the two cases separately — plans that exclude the last house, and plans that exclude the first house. Every legal circular plan falls into at least one of them.

</details>

<details>
<summary>Hint 3</summary>

Run your linear House Robber solution on `nums[:-1]` and on `nums[1:]`, and return the larger. Watch the single-house case: both slices are empty, so handle `len(nums) == 1` before slicing.

</details>
