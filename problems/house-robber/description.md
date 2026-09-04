You are a robber planning to rob houses along a street. `nums[i]` is the amount of money in the `i`-th house.

You may not rob **two adjacent houses** — doing so triggers the alarm.

Return the maximum amount of money you can steal.

---

### Example 1

```
Input: nums = [1,1,3,3]

Output: 4
```

Explanation: rob house `0` and house `2`, or house `0` and house `3`, for `1 + 3 = 4`.

### Example 2

```
Input: nums = [2,9,8,3,6]

Output: 16
```

Explanation: rob houses `0`, `2` and `4` for `2 + 8 + 6 = 16`. Note that skipping two houses in a row is allowed.

---

### Constraints

- `1 <= nums.length <= 100`
- `0 <= nums[i] <= 100`

---

### Hints

<details>
<summary>Hint 1</summary>

The greedy instinct — always take the largest remaining house — is wrong. On `[2,9,8,3,6]` greedy takes `9`, which locks out both `8` and the better total of `16`. You have to compare whole plans, not individual houses.

</details>

<details>
<summary>Hint 2</summary>

At house `i` you have exactly two options: **rob it**, which adds `nums[i]` to the best total from house `i - 2`; or **skip it**, which keeps the best total from house `i - 1`. Take the larger.

</details>

<details>
<summary>Hint 3</summary>

`dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])`. As with the staircase problems, each value looks only two positions back, so two rolling variables replace the array.

</details>
