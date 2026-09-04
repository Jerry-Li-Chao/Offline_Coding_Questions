A message of uppercase letters was encoded to digits using the mapping:

```
'A' -> "1"
'B' -> "2"
...
'Z' -> "26"
```

To **decode** a digit string you split it into pieces and map each piece back to a letter. A piece is valid only if it is `"1"` through `"26"` — so `"06"` is not a valid piece, because the encoding of `'F'` is `"6"`, never `"06"`.

Given a string `s` of digits, return the number of ways to decode it. Return `0` if it cannot be decoded at all.

The answer is guaranteed to fit in a 32-bit integer.

---

### Example 1

```
Input: s = "12"

Output: 2
```

Explanation: `"1 2"` gives `"AB"`, and `"12"` gives `"L"`.

### Example 2

```
Input: s = "01"

Output: 0
```

Explanation: no piece may have a leading zero, so there is no valid split.

---

### Constraints

- `1 <= s.length <= 100`
- `s` contains only digits.

---

### Hints

<details>
<summary>Hint 1</summary>

Reading left to right, at each position you may consume **one** digit or **two** digits. That is the same branching shape as Climbing Stairs — with validity rules attached to each move.

</details>

<details>
<summary>Hint 2</summary>

A one-digit piece is valid unless it is `'0'`. A two-digit piece is valid only when it reads between `10` and `26` — meaning its first digit is `'1'`, or it is `'2'` followed by a digit `'0'`–`'6'`.

</details>

<details>
<summary>Hint 3</summary>

`dp[i]` = number of ways to decode the suffix starting at `i`. Then `dp[i] = dp[i + 1]` if the single digit is valid, plus `dp[i + 2]` if the two-digit piece is valid. Base case `dp[n] = 1` — the empty suffix has exactly one decoding.

</details>
