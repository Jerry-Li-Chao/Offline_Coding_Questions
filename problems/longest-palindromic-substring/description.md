Given a string `s`, return the **longest substring** of `s` that is a palindrome.

A substring is a contiguous run of characters. A palindrome reads the same forwards and backwards.

If several substrings tie for the longest, returning **any one of them** is accepted.

---

### Example 1

```
Input: s = "abccbaz"

Output: "abccba"
```

### Example 2

```
Input: s = "aaaa"

Output: "aaaa"
```

---

### Constraints

- `1 <= s.length <= 1000`
- `s` contains only lowercase English letters.

---

### Hints

<details>
<summary>Hint 1</summary>

Checking all `O(n^2)` substrings and verifying each in `O(n)` gives an `O(n^3)` brute force. To do better, stop treating each substring as independent — palindromes are built out of smaller palindromes.

</details>

<details>
<summary>Hint 2</summary>

Turn it inside out. Instead of picking a substring and testing it, pick a **centre** and grow outward while the characters on both sides match. Every palindrome has a centre, so this finds them all.

</details>

<details>
<summary>Hint 3</summary>

There are `2n - 1` centres, not `n`: each single character (odd-length palindromes like `"aba"`) and each gap between adjacent characters (even-length ones like `"abba"`). Handle both, and track the longest span you have seen.

</details>
