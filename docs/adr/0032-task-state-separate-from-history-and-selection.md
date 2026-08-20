# Keep guided task state separate from graph history and plant selection

Arrange, Compare, and Select Plants form one card-scoped, mutually exclusive task state machine with `idle`, `arrange`, `compare`, and `select_plants` states. Metric Comparisons remain in their user-and-growspace store, active metric keys and history cache remain in the history store, and an Arrangement Draft remains scoped to its Arrange session. This replaces the overloaded `isEditMode`, `mobileLink`, and immediate `linkedGraphGroups` interactions instead of stretching any of them into task orchestration; ordinary graph activation continues to use active metric keys, with comparison membership deciding whether one key toggles an entire saved group.

## Considered Options

- Extending `isEditMode` was rejected because bulk plant selection and provisional spatial arrangement have different activation, persistence, cancellation, and keyboard semantics.
- Keeping comparisons in the history store was rejected because they are durable user preferences, while history loading and the set of currently open graphs are transient rendering concerns.
