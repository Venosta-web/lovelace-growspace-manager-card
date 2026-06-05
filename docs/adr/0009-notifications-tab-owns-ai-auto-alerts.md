# Notifications Tab owns ai_auto_alerts, not Growmaster Settings Panel

`ai_auto_alerts` controls whether the backend automatically fires [[Triage Alert]] notifications when a Bayesian sensor trips — it is a notification delivery toggle, not an AI behaviour setting. We moved it from the Growmaster Settings Panel to the [[Notifications Tab]] so all notification delivery configuration lives in one place (cooldowns, timed rules, AI alert firing). The alternative — keeping it in the Growmaster Settings Panel alongside `ai_enabled` and `assistant_id` — would require a user to visit two dialogs to understand why notifications are or aren't arriving.

## Consequences

The Growmaster Settings Panel's "Alerts" section is removed entirely. The `save_notification_settings` WebSocket command must atomically update both `notification_settings` and `ai_settings.ai_auto_alerts` in config entry options, since `ai_auto_alerts` remains stored under `ai_settings` on the backend.
