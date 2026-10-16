---
description: "Add the operator’s factual note to a practitioner record."
---
# log

Add the operator’s factual note to a practitioner record.


Run:

```bash
node scripts/credentials.mjs log <provider> --text="<note>" --actor="<operator>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
