## 1. Recursion

Try every element as the next one in the subsequence.

```python
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        def longest(i: int, prev: int) -> int:
            if i == len(nums):
                return 0
            best = longest(i + 1, prev)                     # skip nums[i]
            if prev < nums[i]:
                best = max(best, 1 + longest(i + 1, nums[i]))  # take it
            return best

        return longest(0, float("-inf"))
```

**Time complexity:** `O(2^n)`  ·  **Space complexity:** `O(n)`

> **This times out on the hidden tests.** It is published to show the shape of the problem — the exponential blow-up is exactly what the next section removes.

---

## 2. Dynamic Programming

`dp[i]` is the length of the longest increasing subsequence **ending at index `i`**. Anchoring at an endpoint is the key move — it makes each subproblem depend only on earlier, already-solved ones.

```python
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        n = len(nums)
        dp = [1] * n                        # every element alone is length 1

        for i in range(1, n):
            for j in range(i):
                if nums[j] < nums[i]:
                    dp[i] = max(dp[i], 1 + dp[j])

        return max(dp)
```

**Time complexity:** `O(n^2)`  ·  **Space complexity:** `O(n)`

### Why the answer is `max(dp)` and not `dp[-1]`

`dp[i]` measures subsequences *ending at* `i`. The overall best may end anywhere. On `[1,2,3,0]`, `dp` is `[1,2,3,1]` — the answer is `3`, but `dp[-1]` is `1`. Returning the last entry is the most common bug in this problem, and it only shows up when the array ends on a small value.

### Why `dp` starts at all `1`s

Every single element is an increasing subsequence of length one. That is the base case, and it also handles the situation where no earlier element is smaller.

---

## 3. Patience Sorting — `O(n log n)`

A different formulation. Maintain a list `tails` where `tails[k]` is the **smallest possible tail value** of any increasing subsequence of length `k + 1`.

For each number, binary search for the first tail that is `>= n` and overwrite it. If there is none, `n` extends the longest run so far and gets appended.

```python
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []

        for n in nums:
            i = bisect.bisect_left(tails, n)
            if i == len(tails):
                tails.append(n)             # n extends the longest run
            else:
                tails[i] = n                # smaller tail for that length

        return len(tails)
```

**Time complexity:** `O(n log n)`  ·  **Space complexity:** `O(n)`

### What `tails` is — and is not

`tails` is **not** an actual longest increasing subsequence. On `[9,1,4,2,3]` it ends as `[1,2,3]`, which happens to be one here, but on `[3,4,1]` it ends as `[1,4]` — not a subsequence of the input at all. Only its **length** is meaningful.

The invariant that makes it work: keeping the smallest possible tail for each length never hurts. A smaller tail can be extended by strictly more future values, so overwriting is always safe.

Use `bisect_left` (not `bisect_right`) because the subsequence must be *strictly* increasing — an equal value should replace the existing tail rather than extend past it. Swapping to `bisect_right` solves the non-decreasing variant, which is a nice thing to know when an interviewer changes the requirement mid-question.

Write the `O(n^2)` version first. It is what most interviewers expect, and mentioning that an `O(n log n)` approach exists — even without coding it — usually earns the credit.
