---
description: "Record a hold on a site appointment with its reason reference."
---
# pause

Record a hold on a site appointment with its reason reference.


Run:

```bash
node scripts/credentials.mjs pause <appointment> --evidence="<decision reference>" --actor="<operator>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
