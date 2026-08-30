You are given two integer arrays `nums1` and `nums2`, each sorted in **ascending** order. Return the **median** of the combined set of all their elements.

The median is the middle value once everything is sorted. If the total number of elements is even, the median is the average of the two middle values.

Your solution must run in `O(log(m + n))` time, where `m` and `n` are the lengths of the two arrays.

---

### Example 1

```
Input: nums1 = [1,2], nums2 = [3]

Output: 2.0
```

### Example 2

```
Input: nums1 = [1,3], nums2 = [2,4]

Output: 2.5
```

Explanation: the merged array is `[1,2,3,4]`, so the median is `(2 + 3) / 2 = 2.5`.

---

### Constraints

- `0 <= nums1.length, nums2.length <= 1000`
- `1 <= nums1.length + nums2.length <= 2000`
- `-1000000 <= nums1[i], nums2[i] <= 1000000`

---

### Hints

<details>
<summary>Hint 1</summary>

Merging the two arrays gives the answer in `O(m + n)` — write that first to have something correct. To beat it, notice you never actually need the merged array: you only need the one or two values sitting in the middle.

</details>

<details>
<summary>Hint 2</summary>

Think of it as cutting each array into a left part and a right part, so that the two left parts combined hold exactly half of all the elements. The median then depends only on the four values touching the cut: the last of each left part and the first of each right part.

</details>

<details>
<summary>Hint 3</summary>

Choosing how many elements to take from `nums1` fixes how many must come from `nums2`, so there is only **one** number to search for. Binary search it over the **shorter** array to keep the range small. A cut is correct when `left1 <= right2` and `left2 <= right1`; use `-inf` and `+inf` for the edges where a part is empty.

</details>
