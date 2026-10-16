ALTER VIEW appointment_checks RENAME TO credential_checks;
CREATE VIEW appointment_checks AS
 SELECT * FROM credential_checks
 UNION ALL
 SELECT a.id,a.code,p.name,p.owner,s.name,a.status,a.starts_on,a.ends_on,
 CASE WHEN p.jurisdiction='AU' THEN 'au-registration' ELSE 'nz-apc' END,
 NULL::integer,NULL::text,NULL::date,NULL::date,NULL::text,
 CASE WHEN p.jurisdiction='NZ' AND p.profession<>'medical' THEN 'Profession rule set requires review'
 ELSE 'Missing mandatory registration requirement' END
 FROM appointments a JOIN providers p ON p.id=a.provider_id JOIN sites s ON s.id=a.site_id
 WHERE (p.jurisdiction='NZ' AND p.profession<>'medical') OR NOT EXISTS (
 SELECT 1 FROM requirements r WHERE r.site_id=a.site_id AND r.profession=p.profession
 AND r.kind=CASE WHEN p.jurisdiction='AU' THEN 'au-registration' ELSE 'nz-apc' END);
CREATE OR REPLACE VIEW site_readiness AS
 SELECT appointment_id,appointment,provider,owner,site,status,starts_on,ends_on,
 count(*) FILTER (WHERE finding<>'Recorded checks complete')::integer AS gaps,
 string_agg(DISTINCT finding,'; ' ORDER BY finding) AS findings
 FROM appointment_checks GROUP BY appointment_id,appointment,provider,owner,site,status,starts_on,ends_on;
