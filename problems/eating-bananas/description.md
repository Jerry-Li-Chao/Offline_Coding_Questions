Koko loves bananas. There are `n` piles in front of her, where `piles[i]` is the number of bananas in the `i`-th pile. The guards will be back in `h` hours.

Koko picks a single eating speed `k` bananas per hour, then eats for one hour at a time. Each hour she chooses one pile and eats `k` bananas from it. **If the pile has fewer than `k` bananas left, she eats the whole pile and then stops for that hour** — she does not move on to another pile until the next hour.

Return the **smallest** integer `k` that lets her finish every pile within `h` hours.

---

### Example 1

```
Input: piles = [1,4,3,2], h = 9

Output: 2
```

Explanation: at `k = 2` the piles take `1 + 2 + 2 + 1 = 6` hours. At `k = 1` they would take `1 + 4 + 3 + 2 = 10` hours, which is too slow.

### Example 2

```
Input: piles = [25,10,23,4], h = 4

Output: 24
```

---

### Constraints

- `1 <= piles.length <= 1000`
- `piles.length <= h <= 1000000`
- `1 <= piles[i] <= 1000000000`

---

### Hints

<details>
<summary>Hint 1</summary>

The array itself is not sorted, so you are not binary searching the *array*. Ask instead what the possible answers are: `k` is somewhere in `[1, max(piles)]`. Any speed above `max(piles)` behaves exactly like `max(piles)`, since she can only finish one pile per hour anyway.

</details>

<details>
<summary>Hint 2</summary>

The key property is **monotonicity**. If speed `k` is fast enough to finish in `h` hours, then every speed greater than `k` is fast enough too. So the range of candidate speeds looks like `[too slow, too slow, ..., too slow, fast enough, ..., fast enough]` — exactly the shape binary search exploits.

</details>

<details>
<summary>Hint 3</summary>

For a candidate speed `k`, the hours needed are `sum(ceil(pile / k) for pile in piles)`. In Python, `ceil(a / b)` for positive integers is written `-(-a // b)` or `(a + b - 1) // b` — both avoid floating-point error. Binary search for the smallest `k` whose total is `<= h`, remembering the best valid `k` you have seen.

</details>
