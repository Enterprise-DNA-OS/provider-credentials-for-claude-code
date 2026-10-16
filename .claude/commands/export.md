---
description: "Export every domain record, source row and audit event as JSON."
---
# export

Export every domain record, source row and audit event as JSON.


Run:

```bash
node scripts/credentials.mjs export --out=<backup.json>
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
