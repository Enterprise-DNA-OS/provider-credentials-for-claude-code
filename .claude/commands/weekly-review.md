---
description: "Draft the Monday review from attention, dashboard and compliance."
---
# weekly-review

Draft the Monday review from attention, dashboard and compliance.

Read the draft file, check it against the returned records, and show the operator the path. Nothing sends.

Run:

```bash
node scripts/credentials.mjs weekly-review
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
