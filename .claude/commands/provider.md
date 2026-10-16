---
description: "Read one practitioner, credentials, site appointments, tasks and notes."
---
# provider

Read one practitioner, credentials, site appointments, tasks and notes.


Run:

```bash
node scripts/credentials.mjs provider "<code or name>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
