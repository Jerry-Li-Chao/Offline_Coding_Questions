You are given an integer array `cost` where `cost[i]` is the price of stepping **off** the `i`-th stair.

You may start on either stair `0` or stair `1`. From a stair you may climb **one** or **two** stairs, paying that stair's cost as you leave it.

Return the minimum total cost to climb past the top of the staircase — that is, to reach index `len(cost)`.

---

### Example 1

```
Input: cost = [1,2,3]

Output: 2
```

Explanation: start on stair `1`, pay `2`, and take two steps to leave the staircase.

### Example 2

```
Input: cost = [1,2,1,2,1,1,1]

Output: 4
```

---

### Constraints

- `2 <= cost.length <= 100`
- `0 <= cost[i] <= 100`

---

### Hints

<details>
<summary>Hint 1</summary>

Think about the cheapest way to *arrive* at each position, including the imaginary position just past the last stair. Arriving at stair `i` means you left either stair `i - 1` or stair `i - 2`.

</details>

<details>
<summary>Hint 2</summary>

`dp[i] = min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2])` — the cost to reach `i` is the cheaper of the two stairs you could have jumped from, plus the price of leaving it. Because you may start on stair `0` or `1` for free, `dp[0] = dp[1] = 0`.

</details>

<details>
<summary>Hint 3</summary>

The answer is `dp[len(cost)]`, not `dp[len(cost) - 1]` — you have to leave the staircase, not just stand on the last stair. As with Climbing Stairs, each value depends only on the previous two, so two variables suffice.

</details>
