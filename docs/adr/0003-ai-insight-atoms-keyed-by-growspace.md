# AI Insight atoms are keyed by growspace ID

The Grow Master Dialog is always opened from a specific growspace and must only show data for that growspace. Briefings, triage alerts, and the active conversation thread are therefore stored in `Map<growspaceId, T>` atoms — the same pattern used by the Irrigation slice — rather than as single global atoms.

The alternative was single atoms that get reset whenever the dialog opens for a different growspace. That approach causes a flash of stale data between the reset and the completed fetch, and creates subtle bugs if two dialogs are ever open simultaneously. Keyed maps avoid both problems: each growspace has its own slot, cached independently, and the dialog simply reads `map.get(growspaceId)`.

`conversationThreads$` remains keyed by thread ID (threads are looked up by ID throughout the slice), but the chat panel filters the rail to threads whose `growspace_id` matches the open dialog, and the active thread is tracked in a separate `activeThreadId$` map keyed by growspace ID.
