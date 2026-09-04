You are given an integer array `coins` of distinct coin denominations, and an integer `amount`.

Return the **fewest number of coins** needed to make up exactly `amount`. You have an unlimited supply of each denomination.

If the amount cannot be made from the given coins, return `-1`.

---

### Example 1

```
Input: coins = [1,5,10], amount = 12

Output: 3
```

Explanation: `10 + 1 + 1`.

### Example 2

```
Input: coins = [2], amount = 3

Output: -1
```

---

### Constraints

- `1 <= coins.length <= 100`
- `1 <= coins[i] <= 10000`
- `0 <= amount <= 10000`

---

### Hints

<details>
<summary>Hint 1</summary>

Greedy — always take the largest coin that fits — is wrong here. With `coins = [1,3,4]` and `amount = 6`, greedy takes `4 + 1 + 1 = 3` coins, but `3 + 3 = 2` coins is better. Arbitrary denominations break the greedy argument.

</details>

<details>
<summary>Hint 2</summary>

Think about the **last coin** you place. If the final coin has value `c`, then the rest of the solution is the best way to make `amount - c`. So `dp[a] = 1 + min(dp[a - c])` over every coin `c` that fits.

</details>

<details>
<summary>Hint 3</summary>

Build `dp` from `0` up to `amount`, so every smaller amount is already solved. Initialize entries to something meaning "impossible" — `float("inf")` or `amount + 1` — with `dp[0] = 0`, since zero coins make zero. At the end, translate "still impossible" back into `-1`.

</details>
