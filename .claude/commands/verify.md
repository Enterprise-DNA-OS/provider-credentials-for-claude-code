---
description: "Record the actual result of a primary-source check made by the operator."
---
# verify

Record the actual result of a primary-source check made by the operator.

Read docs/compliance.md first. The result is a record check, never a legal certificate or an instruction to practise. Check primary sources and scope conditions. Never invent a register result.

Run:

```bash
node scripts/credentials.mjs verify <credential> --checked=YYYY-MM-DD --result=<current|conditions|suspended|not-found|non-practising> --source="<evidence reference>" --actor="<operator>" --note="<scope or conditions>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
