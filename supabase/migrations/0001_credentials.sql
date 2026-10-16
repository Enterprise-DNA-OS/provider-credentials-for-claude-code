CREATE TABLE providers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
 jurisdiction text NOT NULL CHECK(jurisdiction IN ('NZ','AU')), profession text NOT NULL CHECK(profession IN ('medical','nursing','allied-health')),
 owner text NOT NULL, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
 jurisdiction text NOT NULL CHECK(jurisdiction IN ('NZ','AU')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE credentials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, provider_id uuid NOT NULL REFERENCES providers,
 kind text NOT NULL CHECK(kind IN ('nz-apc','au-registration','indemnity','board-certificate')),
 reference text NOT NULL, issued_on date NOT NULL, expires_on date NOT NULL CHECK(expires_on>=issued_on),
 evidence_ref text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), credential_id uuid NOT NULL REFERENCES credentials,
 checked_on date NOT NULL CHECK(checked_on<=CURRENT_DATE), result text NOT NULL CHECK(result IN ('current','conditions','suspended','not-found','non-practising')),
 source text NOT NULL CHECK(length(trim(source))>0), actor text NOT NULL CHECK(length(trim(actor))>0), note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL REFERENCES sites,
 profession text NOT NULL CHECK(profession IN ('medical','nursing','allied-health')),
 kind text NOT NULL CHECK(kind IN ('nz-apc','au-registration','indemnity','board-certificate')),
 verification_days integer NOT NULL DEFAULT 30 CHECK(verification_days BETWEEN 1 AND 365),
 UNIQUE(site_id,profession,kind), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 provider_id uuid NOT NULL REFERENCES providers, site_id uuid NOT NULL REFERENCES sites,
 starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paused','ended')),
 scope_review_ref text NOT NULL DEFAULT '', decision_ref text NOT NULL DEFAULT '', decision_by text NOT NULL DEFAULT '', decision_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, provider_id uuid NOT NULL REFERENCES providers,
 title text NOT NULL, due_on date NOT NULL, owner text NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')), completion_ref text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL REFERENCES providers,
 body text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE source_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_file text NOT NULL, source_id text NOT NULL, local_table text NOT NULL,
 local_id uuid NOT NULL, raw_row jsonb NOT NULL, UNIQUE(source_file,source_id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text NOT NULL, entity text NOT NULL, record_id uuid,
 actor text NOT NULL, before_state jsonb, after_state jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credentials_provider_idx ON credentials(provider_id);
CREATE INDEX verifications_latest_idx ON verifications(credential_id,checked_on DESC,created_at DESC);
CREATE INDEX appointments_provider_idx ON appointments(provider_id);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['providers','sites','credentials','verifications','requirements','appointments','tasks','notes','source_rows','audit_events'] LOOP
 EXECUTE format('CREATE TRIGGER touch_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM public',t);
 END LOOP;
END $$;
CREATE VIEW credential_register AS
 SELECT c.*,p.name AS provider,p.code AS provider_code,p.owner,p.active,p.jurisdiction,p.profession,
 v.checked_on,v.result AS verification_result,v.source AS verification_source,v.actor AS verifier,
 c.expires_on-CURRENT_DATE AS days_left
 FROM credentials c JOIN providers p ON p.id=c.provider_id
 LEFT JOIN LATERAL (SELECT * FROM verifications v WHERE v.credential_id=c.id ORDER BY checked_on DESC,created_at DESC,id DESC LIMIT 1) v ON true;
CREATE VIEW appointment_checks AS
 SELECT a.id AS appointment_id,a.code AS appointment,p.name AS provider,p.owner,s.name AS site,a.status,a.starts_on,a.ends_on,
 r.kind,r.verification_days,c.code AS credential,c.expires_on,c.checked_on,c.verification_result,
 CASE WHEN NOT p.active THEN 'Inactive provider'
 WHEN a.ends_on<CURRENT_DATE THEN 'Appointment ended by date'
 WHEN r.id IS NULL THEN 'No site requirements configured'
 WHEN c.id IS NULL THEN 'Missing credential'
 WHEN c.issued_on>GREATEST(CURRENT_DATE,a.starts_on) THEN 'Credential not yet effective'
 WHEN c.expires_on<GREATEST(CURRENT_DATE,a.starts_on) THEN
  CASE WHEN r.kind='au-registration' THEN 'Registration date passed: check public register' ELSE 'Credential expired before start or today' END
 WHEN c.evidence_ref='' THEN 'Missing document evidence'
 WHEN c.checked_on IS NULL THEN 'Never verified'
 WHEN c.checked_on<CURRENT_DATE-r.verification_days THEN 'Verification stale by site policy'
 WHEN c.verification_result NOT IN ('current','conditions') THEN 'Register result needs review'
 WHEN c.verification_result='conditions' AND a.scope_review_ref='' THEN 'Conditions need scope review'
 ELSE 'Recorded checks complete' END AS finding
 FROM appointments a JOIN providers p ON p.id=a.provider_id JOIN sites s ON s.id=a.site_id
 LEFT JOIN requirements r ON r.site_id=a.site_id AND r.profession=p.profession
 LEFT JOIN LATERAL (SELECT * FROM credential_register c WHERE c.provider_id=p.id AND c.kind=r.kind ORDER BY c.expires_on DESC,c.created_at DESC,c.id DESC LIMIT 1) c ON true;
CREATE VIEW site_readiness AS
 SELECT appointment_id,appointment,provider,owner,site,status,starts_on,ends_on,
 count(*) FILTER (WHERE finding<>'Recorded checks complete')::integer AS gaps,
 string_agg(DISTINCT finding,'; ' ORDER BY finding) AS findings
 FROM appointment_checks GROUP BY appointment_id,appointment,provider,owner,site,status,starts_on,ends_on;
CREATE VIEW renewal_queue AS
 SELECT code,provider,owner,kind,reference,expires_on,days_left,verification_result
 FROM credential_register WHERE active AND days_left<=60;
