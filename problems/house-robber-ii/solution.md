## The Idea

Do not write a circular DP. Reduce the problem to one you have already solved.

The circle adds exactly one restriction over the linear version: **houses `0` and `n - 1` cannot both be robbed**. So split into two ordinary House Robber problems:

- **Case A** — ignore the last house entirely: solve on `nums[0 .. n-2]`.
- **Case B** — ignore the first house entirely: solve on `nums[1 .. n-1]`.

Any valid circular plan skips the first house, the last house, or both — so it is covered by at least one case. Neither case can produce an invalid plan, because in each one the two conflicting houses are never both available. The answer is the max of the two.

---

## 1. Two Passes of Linear House Robber

```python
class Solution:
    def rob(self, nums: List[int]) -> int:
        if len(nums) == 1:
            return nums[0]

        def rob_line(houses: List[int]) -> int:
            rob1, rob2 = 0, 0
            for n in houses:
                rob1, rob2 = rob2, max(rob2, rob1 + n)
            return rob2

        return max(rob_line(nums[:-1]), rob_line(nums[1:]))
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(n)` for the slices

### The single-house edge case

With `nums = [5]`, the slices `nums[:-1]` and `nums[1:]` are both empty, so `rob_line` returns `0` for each and the answer would wrongly be `0`. The house is simultaneously "first" and "last", so excluding either excludes the only house there is. Handle `len(nums) == 1` up front.

---

## 2. Without Slicing

Pass index bounds instead of copying the array, and the space drops to `O(1)`.

```python
class Solution:
    def rob(self, nums: List[int]) -> int:
        if len(nums) == 1:
            return nums[0]

        def rob_range(start: int, end: int) -> int:
            rob1, rob2 = 0, 0
            for i in range(start, end):
                rob1, rob2 = rob2, max(rob2, rob1 + nums[i])
            return rob2

        return max(rob_range(0, len(nums) - 1),   # drop the last house
                   rob_range(1, len(nums)))       # drop the first house
```

**Time complexity:** `O(n)`  ·  **Space complexity:** `O(1)`

### Why not just "subtract the conflict"?

A tempting shortcut is to solve the linear problem and patch the answer when it uses both ends. That does not work: removing one end can change the *entire* optimal plan downstream, not just that one house. Solving two clean subproblems is both simpler and correct.

### The transferable trick

"A circular constraint becomes two linear problems" shows up repeatedly — circular arrays, circular queues, cyclic scheduling. When a wrap-around edge is the only thing making a problem hard, try **fixing a decision about that edge** and solving the now-linear problem once per case.
