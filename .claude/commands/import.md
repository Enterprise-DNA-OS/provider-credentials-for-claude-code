---
description: "Validate and import the supported Salesforce detail reports in one transaction."
---
# import

Validate and import the supported Salesforce detail reports in one transaction.

Read docs/replace-salesforce-health-cloud.md. Use a fresh trial database first. Check the dry-run counts, preserve the originals, then remove --dry-run only for the agreed import. Changed source rows stop for reconciliation. Imported appointments are pending and credentials unverified.

Run:

```bash
node scripts/credentials.mjs import salesforce --dir=<reports-folder> --dry-run --actor="<operator>"
```

Read before changing a record. Use an exact code or ID when names are ambiguous. Present dates, owners, gaps and source references in plain words. The CLI supports --json. Do not send, delete, grant clinical privileges or contact a regulator.
