Given an array of positive integers `nums`, return `true` if it can be split into **two subsets with equal sums**.

Every element must go into exactly one of the two subsets.

---

### Example 1

```
Input: nums = [1,2,3,4]

Output: true
```

Explanation: `[1,4]` and `[2,3]` both sum to `5`.

### Example 2

```
Input: nums = [1,2,3,4,5]

Output: false
```

---

### Constraints

- `1 <= nums.length <= 100`
- `1 <= nums[i] <= 50`

---

### Hints

<details>
<summary>Hint 1</summary>

If the two halves have equal sums, each is exactly `total / 2`. So if `total` is **odd**, the answer is immediately `false` — no work needed.

</details>

<details>
<summary>Hint 2</summary>

You never need to build both subsets. Finding *any* subset that sums to `total / 2` is enough, because everything left over automatically sums to the same thing. That reduces the problem to: **is some subset sum equal to `target`?**

</details>

<details>
<summary>Hint 3</summary>

Track the set of sums reachable so far. Start with `{0}`, and for each number `n`, add `existing + n` for every sum already reachable. If `target` ever appears, return `true`. A `set` makes this a few lines; a boolean array over `0..target` is the classic table version.

</details>
