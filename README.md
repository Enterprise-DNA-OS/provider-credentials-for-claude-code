# Provider Credentials for Claude Code

Practitioners, credential evidence, renewals and site approvals in a database you own. MIT code from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free code. Clone, install and run the demo. Hosting and coding-agent costs are yours. | Your evidence rules, Salesforce records and approval documents. [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=salesforce-health-cloud). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=salesforce-health-cloud). |

## The credential desk

A medical group's credential administrator reviews expiring certificates, checks the official register, gathers evidence, prepares the site committee pack and records its decision. This build holds that work. It serves existing practitioners, not recruitment. It does not hold patient records, process insurance claims, make clinical decisions or grant professional registration.

Salesforce currently lists Health Cloud Sales & Service Core at US$350 per user per month, billed annually. Ten users illustrate US$42,000 a year. That is a base-platform list-price calculation, not a verified customer invoice or a quote for credentialing add-ons. [Salesforce pricing](https://www.salesforce.com/healthcare/cloud/pricing/), checked 16 October 2026. This focused register replaces credential-desk work, not every Health Cloud capability.

## Quick start

Node 20 or newer. The local demo uses embedded PGlite; no server is needed.

```bash
git clone https://github.com/Enterprise-DNA-OS/provider-credentials-for-claude-code.git
cd provider-credentials-for-claude-code
npm install
npm test
npm run demo
```

All demo people, sites and registration references are fictional. The demo keeps its database in .data/demo and ignores any configured DATABASE_URL. It deliberately includes an expired NZ certificate, an Australian renewal awaiting a register check, missing indemnity evidence, stale verification and overdue requests.

For subsequent demo queries on Linux or macOS:

```bash
DATA_DIR=.data/demo node scripts/credentials.mjs renewals-due
DATA_DIR=.data/demo npm run view
DATA_DIR=.data/demo npm run docs
```

On PowerShell set `$env:DATA_DIR='.data/demo'` and run the same commands without the DATA_DIR prefix. For your own records use a fresh DATA_DIR and npm run migrate, then import without seeding. DATABASE_URL selects a controlled PostgreSQL database. See [docs/cli.md](docs/cli.md).

## Recurring work

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

## Ten questions across your records

Run `node scripts/credentials.mjs insights`. These join evidence, owners and site decisions in this build. They do not claim a configured Salesforce report can never answer the same question.

1. Which sites have the most gaps before their next committee review?
2. Which providers have a practising certificate due within sixty days?
3. Which Australian registrations need a live register check after the recorded expiry?
4. Which site appointments have no indemnity evidence?
5. Who owns overdue requests for credential evidence?
6. Which pending appointments have completed their recorded checks?
7. Which approved appointments have developed new record gaps?
8. Which credentials have never been independently checked?
9. Which providers appear at more than one site?
10. Which register conditions still need a recorded scope review?

## Your first hour: ten things to ask for

1. Which certificates expire in the next sixty days?
2. Read Mara's complete credential file.
3. Which requests are overdue and who owns them?
4. Show the evidence missing from next week's committee pack.
5. Draft the Monday review.
6. Draft a renewal evidence request for PR-102.
7. Show which appointments have completed their recorded checks.
8. Record the register result I have just checked, with its source.
9. Trial-import the mapped Salesforce report folder.
10. Add our credential coordinator field and a view grouped by coordinator.

## Documents and read-only views

`npm run docs` renders provider credential files, renewal-request drafts and appointment-review drafts. `npm run view` renders the week, verification desk and committee dashboards. Both use brand.json for the business name, logo and colours. Output is HTML to open or print, with no server or action buttons. Drafts stay in drafts/; nothing sends.

## Checks and limits

Read [docs/compliance.md](docs/compliance.md). NZ medical practitioners need a current practising certificate. Australian expiry dates trigger a live-register review, not a finding that a person cannot practise. Site evidence, freshness and indemnity requirements are local policy. Recorded approval never replaces the responsible professional's scope and eligibility decision. The built-in approval checks cover NZ medical practitioners and Australian registered professions; NZ nursing and allied-health records can be stored but require a separately reviewed ruleset before approval.

The CLI prevents approval with missing required evidence, stale checks or unresolved conditions. Renewing a credential resets its verification state. Gaps are recalculated, so a previously approved appointment can appear in attention later. Credential expiry during an appointment remains a renewal task; approval checks validity at the later of today and the appointment start.

## Bring Salesforce records across

Export Details Only CSV reports, map their headings and controlled values as described in [the switching guide](docs/replace-salesforce-health-cloud.md), then import the folder with one command:

```bash
node scripts/credentials.mjs import salesforce --dir=examples/salesforce --dry-run --actor="Operator"
node scripts/credentials.mjs import salesforce --dir=examples/salesforce --actor="Operator"
```

This supports the documented report projection, not an arbitrary Health Cloud backup. All supported files import together or roll back together. Original source rows are retained; unchanged rows import once. Changed source rows stop for explicit reconciliation. Documents remain references to your evidence store. Imported appointments start pending and imported credentials have no verification.

## Storage and access

Plain PostgreSQL migrations also run on PGlite. Domain records use UUIDs, timestamps and foreign keys. Row-level security has no public policies; access is for the database owner. Actor labels record who an operator says acted; they are not authenticated identities. The audit records before and after state for CLI changes, not a tamper-proof ledger. Shared use needs scoped access, backups, encryption and restoration testing in the chosen deployment.

There is no mobile capture, live register sync, portal or offline sync. [Why no front end](docs/why-no-front-end.md) explains the operating shape. Enterprise DNA can scope those connections and screens for the managed version.

## Validation

`npm test` creates a temporary database, seeds twice, exercises every CLI command and checks failed-import rollback, repeat imports, source-change rejection, date validation, ambiguous names, evidence gates, auditing, drafts and escaped HTML. CI runs Node 20 and 22 on Windows and Linux, plus PostgreSQL 17. TEST_DATABASE_URL is for a disposable test database; the test creates and removes its own schema.

## Licence

MIT. Copyright (c) 2026 Enterprise DNA. Salesforce is a trademark of Salesforce, Inc. This independent project is not affiliated with or endorsed by Salesforce.
