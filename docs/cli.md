# CLI contract

Use `node scripts/credentials.mjs help`. Every data command supports --json. Human output is aligned text. Flags accept --key=value or --key value. Record selectors accept exact codes, full UUIDs, UUID prefixes or case-insensitive name fragments. Ambiguous matches list candidates and exit 1. Use the exact code to proceed.

## Reads

providers, provider <selector>, sites, credentials, requirements, appointments, tasks, renewals-due, verification-due, committee-pack, dashboard, attention, compliance, history and insights. The help command lists the complete set. The provider detail returns all linked evidence and notes. The desk verification queue uses thirty days; appointment checks use each site's policy.

## New records

`add <kind> --file=<input.json> --actor="Operator"` validates and writes one record. Its JSON fields are:

| Kind | Required fields | Optional fields |
|---|---|---|
| provider | code, name, jurisdiction, profession, owner | none |
| site | code, name, jurisdiction | none |
| credential | code, provider_id, kind, reference, issued_on, expires_on | evidence_ref |
| requirement | site_id, profession, kind | verification_days, default 30 |
| appointment | code, provider_id, site_id, starts_on, ends_on | none |
| task | code, provider_id, title, due_on, owner | none |

Related _id fields accept the same record selectors. Jurisdiction is NZ or AU. Profession is medical, nursing or allied-health. Credential kind is nz-apc, au-registration, indemnity or board-certificate. Dates use YYYY-MM-DD; invalid dates and inverted ranges fail. A site requirement's verification_days is a whole number from 1 to 365. Extra fields fail instead of being silently discarded.

New appointments start pending. Only same-jurisdiction appointments are supported. NZ medical appointments require an nz-apc site requirement; Australian appointments require au-registration. NZ non-medical approval requires a reviewed custom ruleset. Indemnity and board-certificate requirements are site policy. Configure site requirements before any approval.

Example input:

```json
{"code":"CRED-200","provider_id":"PR-101","kind":"nz-apc","reference":"your real register reference","issued_on":"2026-10-16","expires_on":"2027-10-15","evidence_ref":"your controlled document reference"}
```

Only store facts you have verified from your own evidence. The example is a shape, not a real credential.

## Changes

```bash
node scripts/credentials.mjs verify CR-101 --checked=2026-10-16 --result=current --source="register check reference" --actor="Operator" --note="Actual observation"
node scripts/credentials.mjs renew CR-101 --issued=2026-10-16 --expires=2027-10-15 --evidence="renewed document reference" --actor="Operator"
node scripts/credentials.mjs approve AP-101 --evidence="committee decision reference" --scope-review="review reference if conditions apply" --actor="Operator"
node scripts/credentials.mjs pause AP-101 --evidence="hold decision reference" --actor="Operator"
node scripts/credentials.mjs end AP-101 --evidence="end decision reference" --actor="Operator"
node scripts/credentials.mjs log PR-101 --text="Actual observation" --actor="Operator"
node scripts/credentials.mjs complete TASK-101 --evidence="completion reference" --actor="Operator"
```

Verification result is current, conditions, suspended, not-found or non-practising. A check cannot be future dated. The latest check is selected by checked_on, then recorded timestamp, then ID. Backdated entries remain history. Renew extends the expiry and explicitly records that a fresh verification is required. It retains the previous document state in the audit history.

Approval records the operator's decision only after mandatory requirements, document evidence, dates, fresh verification and conditions review are complete. A failed decision rolls back the entire change, including any attempted scope-review update. Ended appointments cannot be reopened. Completed tasks cannot be completed again.

## Imports and exports

```bash
node scripts/credentials.mjs import salesforce --dir=imports/salesforce --dry-run --actor="Operator"
node scripts/credentials.mjs import salesforce --dir=imports/salesforce --actor="Operator"
node scripts/credentials.mjs export --out=exports/backup.json
```

Create the export folder first. Export without --out returns every record as data; use --json to obtain JSON on stdout. The import contract is in replace-salesforce-health-cloud.md. Export is a portable backup format, not a built-in restore command. Test your chosen database backup and restore procedure before live use.

## Drafts and rendering

weekly-review, draft-renewal <provider> and draft-committee write Markdown files to drafts/. `npm run docs` writes branded credential files, renewal requests and appointment reviews. `npm run view` writes the week, verification and committee HTML dashboards. Set OUTPUT_DIR to isolate generated files. No command sends or submits anything.

## Database modes

DATABASE_URL selects PostgreSQL. Without it, DATA_DIR selects PGlite, default .data/db. The adapter reads .env and .env.local without overriding existing environment values. `npm run demo` overrides DATABASE_URL with an empty value and uses .data/demo. `npm test` uses a temporary local database, or a temporary schema in TEST_DATABASE_URL when testing PostgreSQL.
