Given a string `s` and a list of strings `wordDict`, return `true` if `s` can be split into a sequence of one or more words from `wordDict`.

Words from the dictionary may be reused **any number of times**, and you do not have to use all of them.

---

### Example 1

```
Input: s = "neetcode", wordDict = ["neet","code"]

Output: true
```

### Example 2

```
Input: s = "applepenapple", wordDict = ["apple","pen","ape"]

Output: true
```

Explanation: `"apple" + "pen" + "apple"` — `"apple"` is used twice.

### Example 3

```
Input: s = "catsincars", wordDict = ["cats","cat","sin","in","car"]

Output: false
```

---

### Constraints

- `1 <= s.length <= 200`
- `1 <= wordDict.length <= 100`
- `1 <= wordDict[i].length <= 20`
- `s` and `wordDict[i]` contain only lowercase English letters.

---

### Hints

<details>
<summary>Hint 1</summary>

Greedily matching the longest word first does not work. In `"catsincars"` with `["cats","cat","sin",...]`, taking `"cats"` leaves `"incars"`, while taking `"cat"` leaves `"sincars"` which starts promisingly with `"sin"`. You need to explore both.

</details>

<details>
<summary>Hint 2</summary>

Let `dp[i]` mean "the suffix `s[i:]` can be segmented". Then `dp[i]` is true if **some** dictionary word `w` matches at position `i` and `dp[i + len(w)]` is also true.

</details>

<details>
<summary>Hint 3</summary>

Fill right to left with the base case `dp[len(s)] = True` — the empty suffix is trivially segmentable. Use `s.startswith(w, i)` to test a match without slicing.

</details>
