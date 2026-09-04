You are climbing a staircase with `n` steps. Each move you may climb either **one** step or **two** steps.

Return the number of distinct ways to reach the top.

---

### Example 1

```
Input: n = 2

Output: 2
```

Explanation: `1 + 1` and `2`.

### Example 2

```
Input: n = 3

Output: 3
```

Explanation: `1 + 1 + 1`, `1 + 2`, and `2 + 1`.

---

### Constraints

- `1 <= n <= 30`

---

### Hints

<details>
<summary>Hint 1</summary>

Work backwards from the top. To stand on step `n`, your last move came either from step `n - 1` (a single step) or from step `n - 2` (a double step). There is no other way to arrive.

</details>

<details>
<summary>Hint 2</summary>

That gives a recurrence: `ways(n) = ways(n - 1) + ways(n - 2)`, with `ways(0) = 1` (one way to already be there — do nothing) and `ways(1) = 1`. This is the Fibonacci sequence wearing a costume.

</details>

<details>
<summary>Hint 3</summary>

Writing it as plain recursion recomputes the same subproblems exponentially. Either cache the results, or — since each answer depends on only the previous two — build upward with **two variables** and no array at all.

</details>
