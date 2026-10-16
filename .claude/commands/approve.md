---
description: "Record an operator-approved site appointment once the record checks are complete."
---
# approve

Record an operator-approved site appointment once the record checks are complete.

Read docs/compliance.md first. The result is a record check, never a legal certificate or an instruction to practise. Check primary sources and scope conditions. Never invent a register result.

Run:

```bash
node scripts/credentials.mjs approve <appointment> --evidence="<committee decision>" --scope-review="<conditions review if required>" --actor="<operator>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
