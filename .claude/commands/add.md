---
description: "Create a practitioner, site, credential, requirement, appointment or task from an agreed record."
---
# add

Create a practitioner, site, credential, requirement, appointment or task from an agreed record.

Read docs/cli.md. Write only the operator-stated fields to the input JSON file. Resolve related records first. Never invent a person, document, approval or date.

Run:

```bash
node scripts/credentials.mjs add <provider|site|credential|requirement|appointment|task> --file=<input.json> --actor="<operator>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
