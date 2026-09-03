# Environment Change is one interface over Home Assistant actions

**Status:** Accepted

Environment Change is one deep card module at the existing Home Assistant seam. Its interface accepts either the Config Dialog's Shared Environment Draft plus Dirty Write Set or a narrow Tank Config Change; its implementation owns Environment Field Ownership, Atomic Dirty Group validation, sparse Environment Patch composition, canonical snake-case mapping, `configure_environment` then optional `configure_exhaust_fan` ordering, and refresh. The Growspace Dialog Host and Irrigation Dialog are adapters to this interface rather than independent environment writers.

`configure_exhaust_fan` remains a dedicated Home Assistant action and runs second. Any validation, action, or refresh failure rejects the whole request without rollback or partial-success state; caller-owned draft and dirtiness remain available, and retry repeats the idempotent Environment Patch before exhaust. The backend counterpart is growspace_manager ADR-0039.

## Considered Options

- Keep composition, mapping, and sequencing as separate caller-facing modules. Rejected because a newly composed field could still be dropped by a later mapping list and callers retained ordering knowledge.
- Require every caller to provide a Shared Environment Draft. Rejected because the Irrigation Dialog owns a narrow Tank Config Change and should not manufacture unrelated state.
- Generate a cross-repo schema artifact. Rejected because the separately released HACS artifacts retain Home Assistant actions as their seam; structural guards provide parity without release coupling.
