Given an integer array `nums`, find the **contiguous non-empty subarray** with the largest product, and return that product.

The answer is guaranteed to fit in a 32-bit integer.

---

### Example 1

```
Input: nums = [1,2,-3,4]

Output: 4
```

### Example 2

```
Input: nums = [-2,-1]

Output: 2
```

Explanation: the whole array — two negatives multiply to a positive.

---

### Constraints

- `1 <= nums.length <= 1000`
- `-10 <= nums[i] <= 10`

---

### Hints

<details>
<summary>Hint 1</summary>

The obvious approach — track the best product ending at each index — breaks on negative numbers. A very *negative* running product is not useless: one more negative number flips it into a very positive one.

</details>

<details>
<summary>Hint 2</summary>

So track **two** values at each index: the largest product ending here, and the smallest (most negative) product ending here. A negative `nums[i]` swaps their roles.

</details>

<details>
<summary>Hint 3</summary>

At each step the candidates for "largest ending here" are `nums[i]`, `max_so_far * nums[i]`, and `min_so_far * nums[i]`. Take the max of the three for the new maximum and the min of the three for the new minimum — including `nums[i]` alone is what lets a subarray start fresh after a zero.

</details>
