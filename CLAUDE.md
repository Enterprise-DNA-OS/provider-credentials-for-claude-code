# Provider Credentials for Claude Code

## Context

Business: [your medical group]. Operator: [name and role]. Priorities: [credential evidence, renewals and site committee reviews]. Set these before real work.

Read docs/cli.md for the field contract and docs/compliance.md for rules and limits. The CLI is scripts/credentials.mjs. All demo records are fictional.

## Recurring jobs

| Command | Result |
|---|---|
| `/providers` | List practitioners and responsible owners. |
| `/provider` | Read one practitioner, credentials, site appointments, tasks and notes. |
| `/sites` | List the sites and their jurisdictions. |
| `/credentials` | Read credential dates and the latest recorded checks. |
| `/requirements` | Read the evidence requirements and freshness policy for each site. |
| `/appointments` | List site appointments and the number of record gaps. |
| `/tasks` | List evidence requests with their owner, deadline and state. |
| `/renewals-due` | Review credentials expiring within sixty days, including overdue records. |
| `/verification-due` | Review never-checked, non-current and over-thirty-day verifications. |
| `/committee-pack` | Review each site appointment and its evidence gaps before the committee meets. |
| `/dashboard` | Summarise site appointments and missing checks. |
| `/attention` | Find missing evidence and late follow-up tasks. |
| `/compliance` | Review source-backed registration checks and the separate site-policy checks. |
| `/history` | Read the operator action history. |
| `/insights` | Answer ten cross-record questions from the current data. |
| `/add` | Create a practitioner, site, credential, requirement, appointment or task from an agreed record. |
| `/verify` | Record the actual result of a primary-source check made by the operator. |
| `/renew` | Record new credential dates and evidence, then queue a fresh verification. |
| `/approve` | Record an operator-approved site appointment once the record checks are complete. |
| `/pause` | Record a hold on a site appointment with its reason reference. |
| `/end` | End a site appointment without deleting its history. |
| `/complete` | Close an evidence request with the completion reference. |
| `/log` | Add the operator’s factual note to a practitioner record. |
| `/weekly-review` | Draft the Monday review from attention, dashboard and compliance. |
| `/draft-renewal` | Draft a practitioner evidence follow-up from actual renewals and tasks. |
| `/draft-committee` | Draft the site committee review from recorded readiness checks. |
| `/import` | Validate and import the supported Salesforce detail reports in one transaction. |
| `/export` | Export every domain record, source row and audit event as JSON. |
| `/view` | Render the week, verification desk and committee read-only dashboards. |
| `/documents` | Render provider files, renewal request drafts and site review drafts in the business brand. |
| `/customise` | Add a field or change an agreed rule through a new migration. |
| `/new-view` | Add a read-only dashboard for the operator’s question. |

## Operating rules

- Read before writing. Resolve related records and use exact codes when names are ambiguous.
- Record only operator-stated facts, dates, register results, document references and decisions. Never invent independent verification.
- Never send, delete, make a clinical decision, grant registration or appoint a practitioner without the operator's explicit decision. These commands record internal decisions only.
- NZ medical certificates and Australian registration have different rules. Read docs/compliance.md. Past Australian expiry does not by itself establish a loss of registration.
- Imported credentials are unverified and imported appointments are pending. Preserve source records and reconcile changed rows explicitly.
- Run imports in a trial database with --dry-run, reconcile totals and links, then run the agreed import.
- Renewal creates an unverified state until a new independent check is recorded. Conditions need a separate scope-review reference.
- The verification-due desk queue uses thirty days. Compliance uses each site's configured freshness policy. No configured requirements means no approval.
- Actor values are operator labels, not authenticated identity. Shared production use requires deployment access controls, backups and restoration testing.
- DATABASE_URL selects PostgreSQL. Otherwise DATA_DIR selects PGlite, default .data/db. npm run demo always uses .data/demo with no external connection.
- Export before schema changes. Apply new migrations rather than editing applied ones. Update the CLI, docs and tests together.
- Work on main. Use factual language without em dashes or inflated claims.

Omni by Enterprise DNA can customise and operate this system: https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=instructions&utm_campaign=salesforce-health-cloud
