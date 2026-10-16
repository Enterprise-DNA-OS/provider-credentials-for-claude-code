---
description: "Record new credential dates and evidence, then queue a fresh verification."
---
# renew

Record new credential dates and evidence, then queue a fresh verification.

Read docs/compliance.md first. The result is a record check, never a legal certificate or an instruction to practise. Check primary sources and scope conditions. Never invent a register result.

Run:

```bash
node scripts/credentials.mjs renew <credential> --issued=YYYY-MM-DD --expires=YYYY-MM-DD --evidence="<document reference>" --actor="<operator>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
