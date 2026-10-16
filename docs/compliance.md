# Credential record checks

Checked 16 October 2026. These checks organise evidence for a responsible operator. They do not decide legal eligibility or issue a licence. No patient or billing records belong here.

## NZ-MED-APC: New Zealand medical practitioners

The Medical Council states that a doctor must be registered and hold a current practising certificate to practise medicine in New Zealand. The recorded nz-apc credential is checked for a valid date range, evidence and independent verification. Expired or absent evidence is a review gap. A credential record cannot establish that the practitioner's actual work fits their scope or conditions; the operator checks those against the primary source.

Source: [Medical Council practising certificates](https://www.mcnz.org.nz/registration/maintain-or-renew-registration/practising-certificates/).

This rule applies to medical practitioners. NZ nursing and allied-health records need their own regulator and a reviewed rule set before this build allows appointment approval. Do not reuse the medical rule for them.

## AU-REGISTER: Australian registration review

Ahpra advises checking the public register for current registration. Its renewal guidance says a practitioner can continue to practise while their name remains on the register even after the recorded expiry date, subject to their actual registration status and conditions. Therefore a passed expiry produces "Registration date passed: check public register", never "unlicensed".

Source: [Ahpra renewal guidance](https://www.ahpra.gov.au/Registration/Renewal), [Ahpra public register](https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx).

The local site-approval gate conservatively waits until the date discrepancy has been reconciled with sourced evidence. Do not invent a new expiry to clear it. A live register connection or a reviewed exception workflow is a separate customisation. Suspended, not-found and non-practising results block local approval. Conditions require the operator's scope-review reference.

## SITE-POLICY: documentary evidence and verification freshness

Each site chooses the required credential kinds and verification_days (one to 365). The demo uses a thirty-day freshness rule and indemnity evidence. These are demonstration policies, not universal statutory periods or insurance requirements. The general verification-due queue uses thirty days; compliance uses the site's own value. A missing requirement set blocks approval.

Approval checks the later of today and the appointment start. A certificate expiring during an appointment appears in renewals rather than silently extending its validity. Approvals can develop new gaps as time passes. Renewal records require a new verification.

## Decisions, documents and retention

Only the operator records a committee decision and its evidence. The committee pack and renewal request are drafts; no communication, registration or credential submission is sent. Retain source documents in your controlled evidence store and keep references here. Set retention, access, backup and deletion procedures with your organisation before live use. This build has no automatic purge and stores no patient records.

Primary-source checks, scope reviews and deployment safeguards are still necessary. A complete record check is not a compliance certificate.
