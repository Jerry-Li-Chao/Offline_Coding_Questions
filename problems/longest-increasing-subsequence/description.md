Given an integer array `nums`, return the length of its **longest strictly increasing subsequence**.

A subsequence is formed by deleting zero or more elements without reordering the rest. The elements do **not** need to be adjacent.

---

### Example 1

```
Input: nums = [9,1,4,2,3,3,7]

Output: 4
```

Explanation: `[1,2,3,7]` is increasing and has length `4`.

### Example 2

```
Input: nums = [0,3,1,3,2,3]

Output: 4
```

---

### Constraints

- `1 <= nums.length <= 1000`
- `-1000 <= nums[i] <= 1000`

---

### Hints

<details>
<summary>Hint 1</summary>

Define `dp[i]` as the length of the longest increasing subsequence that **ends exactly at index `i`**. Anchoring the subsequence at a specific endpoint is what makes the subproblems combine cleanly.

</details>

<details>
<summary>Hint 2</summary>

To extend to `i`, look at every earlier index `j` with `nums[j] < nums[i]`. Any subsequence ending at such a `j` can be extended by `nums[i]`, so `dp[i] = 1 + max(dp[j])` over those, or `1` if there are none.

</details>

<details>
<summary>Hint 3</summary>

The answer is `max(dp)`, not `dp[-1]` — the best subsequence does not have to end at the last element. That gives `O(n^2)`. There is also an `O(n log n)` solution using binary search over a "smallest tail per length" list.

</details>
