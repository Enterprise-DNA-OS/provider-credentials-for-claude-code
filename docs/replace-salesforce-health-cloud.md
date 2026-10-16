# Switch the provider credential desk from Salesforce Health Cloud

Keep the original exports and document store. This build imports practitioners, sites, credentials and site appointment records. It does not import patients or replace the whole Health Cloud platform.

## Export the detail rows

Salesforce supports Details Only report exports in CSV. In Reports, open the relevant report, use Export, choose Details Only and CSV, and include stable relationship IDs. Export permissions and report types depend on your Salesforce setup; ask the administrator to provide the relevant report when it is unavailable.

Sources checked 16 October 2026:

- [Salesforce report export](https://help.salesforce.com/s/articleView?id=sf.reports_export.htm&language=en_US).
- [Provider relationship data model](https://developer.salesforce.com/docs/platform/data-models/guide/provider-relationship-management.html), which includes healthcare providers, facilities, practitioner-facility links, business licences and credentials.
- [Provider management overview](https://trailhead.salesforce.com/content/learn/modules/health-cloud-for-providers/meet-health-cloud-for-providers).

Those pages establish the export mechanism and domain. They do not promise the four report layouts below exist out of the box. Your administrator maps your report types, object relationships and country-specific custom fields into this explicit projection. Keep IDs as text and use unambiguous dates. Do not use a summary or formatted report with totals.

## The supported report folder

Use these exact file names and headings. Heading case is ignored; headings must be unique. A file may be omitted when it has no records, but each included file must have at least one data row. Dependencies must be present in the folder or already in the local database.

| File | Required headings | Typical source records |
|---|---|---|
| providers.csv | Provider ID, Provider Name, Country, Profession, Owner | Healthcare Provider with its related person/account name and operator-assigned country, profession and owner |
| sites.csv | Site ID, Site Name, Country | Healthcare Facility or the site's related location/account |
| credentials.csv | Credential ID, Provider ID, Kind, Registration Number, Issue Date, Expiry Date, Evidence Reference | Business License or credential report joined to the correct provider |
| appointments.csv | Appointment ID, Provider ID, Site ID, Start Date, End Date | Healthcare Practitioner Facility or the organisation's site-appointment report |

Use the same Provider ID and Site ID consistently across files. Country maps to NZ or AU. Profession maps to medical, nursing or allied-health. Kind maps to nz-apc, au-registration, indemnity or board-certificate. Dates map to YYYY-MM-DD. Evidence Reference may be empty; this leaves a gap in the local review. Unknown columns are preserved in raw_row but do not become operative fields.

The examples/salesforce folder contains fictional mapped report fixtures, not vendor-supplied samples. It demonstrates quoted commas, stable IDs and the linked import.

## Test and bring it across

Install, select a fresh trial DATA_DIR, and run npm run migrate without seed. Place the mapped files in imports/salesforce. Then:

```bash
node scripts/credentials.mjs import salesforce --dir=imports/salesforce --dry-run --actor="Operator"
node scripts/credentials.mjs import salesforce --dir=imports/salesforce --actor="Operator"
node scripts/credentials.mjs providers
node scripts/credentials.mjs credentials
node scripts/credentials.mjs appointments
node scripts/credentials.mjs export --json
```

One import handles the whole folder. It validates links and dates before committing the batch; any error rolls all changes back. Dry-run performs the same work then rolls it back. Unsupported CSV file names fail visibly. Repeating unchanged source rows is safe. Duplicate IDs and changed source rows stop for explicit reconciliation rather than overwriting evidence.

Reconcile practitioner, site, credential and appointment counts against each report. Inspect names, links, dates and raw source rows. Add the site's actual requirements, verify the evidence independently, and record reviewed decisions. Imported credentials remain unverified and appointments remain pending even when a source report includes an approved status.

## What needs separate work

Attachments stay in your controlled document store; this imports references, not files. Provider portals, external register monitoring, document classification, adverse-action feeds, payer contracting, credential committees with multiple signatories, legacy audit events, custom approval automation and clinical records need separate mapping and controls. Historic vendor decisions remain in raw_row if supplied as extra columns; they do not become a new local approval.

Set access, backup, retention and restore procedures before replacing a live process. The local database owner can change records directly, so the CLI audit is not a tamper-proof compliance ledger.

Enterprise DNA can map the Salesforce exports, tailor the evidence and site rules, and run the system through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=switching-guide&utm_campaign=salesforce-health-cloud).
