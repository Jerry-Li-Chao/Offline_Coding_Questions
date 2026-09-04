Given a string `s`, return the **number of palindromic substrings** it contains.

A substring is a contiguous run of characters. Two substrings count separately if they start or end at different positions, even when their text is identical.

---

### Example 1

```
Input: s = "abc"

Output: 3
```

Explanation: `"a"`, `"b"`, `"c"`.

### Example 2

```
Input: s = "aaa"

Output: 6
```

Explanation: `"a"` three times (at each position), `"aa"` twice, and `"aaa"` once.

---

### Constraints

- `1 <= s.length <= 1000`
- `s` contains only lowercase English letters.

---

### Hints

<details>
<summary>Hint 1</summary>

Every single character is itself a palindrome, so the answer is never smaller than `len(s)`.

</details>

<details>
<summary>Hint 2</summary>

This is *Longest Palindromic Substring* with the bookkeeping changed. Instead of remembering the longest palindrome you found, just count them.

</details>

<details>
<summary>Hint 3</summary>

Expand around all `2n - 1` centres. Each successful expansion step *is* one more palindrome — increment the counter inside the `while` loop rather than after it.

</details>
