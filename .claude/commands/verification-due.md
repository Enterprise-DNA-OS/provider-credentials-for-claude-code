---
description: "Review never-checked, non-current and over-thirty-day verifications."
---
# verification-due

Review never-checked, non-current and over-thirty-day verifications.

This is a general thirty-day desk queue. /compliance uses each site’s actual verification_days policy. Read both before deciding what is due.

Run:

```bash
node scripts/credentials.mjs verification-due
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
