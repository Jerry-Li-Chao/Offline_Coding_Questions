An array of length `n` sorted in ascending order is **rotated** between `1` and `n` times. Rotating `[1,2,3,4,5,6]` four times, for example, gives `[3,4,5,6,1,2]`.

You are given such a rotated array `nums` containing **unique** elements, together with an integer `target`. Return the **index** of `target` in `nums`, or `-1` if it is not there.

Your solution must run in `O(log n)` time.

---

### Example 1

```
Input: nums = [3,4,5,6,1,2], target = 1

Output: 4
```

### Example 2

```
Input: nums = [3,5,6,0,1,2], target = 4

Output: -1
```

---

### Constraints

- `1 <= nums.length <= 1000`
- `-1000 <= nums[i], target <= 1000`
- All integers in `nums` are unique.

---

### Hints

<details>
<summary>Hint 1</summary>

You cannot compare `nums[mid]` to `target` and immediately know which way to go — the array is not globally sorted. But here is the useful fact: however you split a rotated array at `mid`, **at least one of the two halves is a normal sorted array**.

</details>

<details>
<summary>Hint 2</summary>

Detect which half is sorted with a single comparison. If `nums[l] <= nums[mid]`, the left half is sorted; otherwise the right half is.

</details>

<details>
<summary>Hint 3</summary>

Once you know which half is sorted, you can test membership in that half with two comparisons against its endpoints. If `target` falls inside the sorted half's range, search there; otherwise search the other half. Be careful with the boundaries — use `<=` where the endpoint is included.

</details>
