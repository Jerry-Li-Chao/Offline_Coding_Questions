## 1. Brute Force

Try every speed from `1` upward and return the first one that fits in `h` hours.

```python
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        speed = 1
        while True:
            hours = 0
            for pile in piles:
                hours += math.ceil(pile / speed)
            if hours <= h:
                return speed
            speed += 1
```

**Time complexity:** `O(max(piles) * n)`  ·  **Space complexity:** `O(1)`

Correct, but `max(piles)` can be a billion — far too slow. **Submitting this here will time out**, which is the point: the hidden tests include a single pile of one billion bananas.

---

## 2. Binary Search on the Answer

This is the pattern the problem is really teaching. You are not searching the input array; you are searching the **space of possible answers**, `[1, max(piles)]`.

That works because the predicate "can Koko finish at speed `k`?" is **monotonic**: false, false, …, false, true, true, …, true. Binary search finds the boundary.

```python
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        l, r = 1, max(piles)
        best = r

        while l <= r:
            k = l + (r - l) // 2

            hours = 0
            for pile in piles:
                hours += (pile + k - 1) // k     # ceil(pile / k)

            if hours <= h:
                best = k                          # fast enough — try slower
                r = k - 1
            else:
                l = k + 1                         # too slow — speed up

        return best
```

**Time complexity:** `O(n * log(max(piles)))`  ·  **Space complexity:** `O(1)`

### Why `best` instead of returning `l`?

Returning `l` at the end also works here, because the loop always converges with `l` sitting on the smallest feasible speed. Tracking `best` explicitly is harder to get wrong and reads more clearly — you record every speed you *proved* was good, so whatever you return has definitely been verified.

### Integer ceiling division

`math.ceil(pile / k)` converts to a float first, which silently loses precision once the numbers get large. `(pile + k - 1) // k` stays in integer arithmetic and is exact for any size input.

---

## 3. Recognizing the Pattern

"Binary search on the answer" applies whenever you can answer *yes/no* to "is candidate `x` good enough?" and the answer flips exactly once as `x` grows. The recipe is always the same:

1. Identify the range of possible answers — here `[1, max(piles)]`.
2. Write a `feasible(x)` check — here "hours needed `<= h`".
3. Binary search for the boundary where `feasible` flips.

The check itself is often a plain `O(n)` loop. The binary search just avoids trying every candidate.
