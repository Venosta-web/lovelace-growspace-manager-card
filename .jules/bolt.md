# Bolt's Performance Journal

Only critical learnings that affect future optimization decisions.

## 2025-12-28 - First Optimization Entry
**Learning:** LitElement render() methods are hot paths - array operations in render should be single-pass when possible.
**Action:** Check for dual filter/map operations with complementary predicates - easily merged into single reduce().
