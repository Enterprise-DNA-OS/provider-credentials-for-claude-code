import fs from 'node:fs';
import path from 'node:path';
import {REPO_ROOT} from './db.mjs';
import {parseCsv,pick} from './csv.mjs';
import {table} from './format.mjs';

export const entities={
 provider:{table:'providers',fields:['code','name','jurisdiction','profession','owner'],required:['code','name','jurisdiction','profession','owner']},
 site:{table:'sites',fields:['code','name','jurisdiction'],required:['code','name','jurisdiction']},
 credential:{table:'credentials',fields:['code','provider_id','kind','reference','issued_on','expires_on','evidence_ref'],required:['code','provider_id','kind','reference','issued_on','expires_on'],links:{provider_id:'providers'}},
 requirement:{table:'requirements',fields:['site_id','profession','kind','verification_days'],required:['site_id','profession','kind'],links:{site_id:'sites'}},
 appointment:{table:'appointments',fields:['code','provider_id','site_id','starts_on','ends_on'],required:['code','provider_id','site_id','starts_on','ends_on'],links:{provider_id:'providers',site_id:'sites'}},
 task:{table:'tasks',fields:['code','provider_id','title','due_on','owner'],required:['code','provider_id','title','due_on','owner'],links:{provider_id:'providers'}}
};
export const tables=['providers','sites','credentials','verifications','requirements','appointments','tasks','notes','source_rows','audit_events'];
export function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error(`Invalid date: ${s}; use YYYY-MM-DD`);return s;}
export function required(v,name){if(typeof v!=='string'||!v.trim())throw Error(`${name} is required`);return v.trim();}
export async function resolve(db,t,term){
 if(!tables.includes(t))throw Error('Unknown entity');required(term,'Record');
 const name=['providers','sites'].includes(t)?'name':'code';
 const rows=await db.query(`select * from ${t} where id::text=$1 or lower(code)=lower($1) or id::text like $2 or lower(${name}) like lower($3) order by code`,[term,term+'%','%'+term+'%']);
 const exact=rows.filter(x=>x.id===term||x.code.toLowerCase()===term.toLowerCase());
 if(exact.length===1)return exact[0];
 if(rows.length===1)return rows[0];
 const e=Error(rows.length?`Ambiguous ${t}: ${rows.map(x=>`${x.code} ${x.name||''} (${x.id})`).join('; ')}`:`No ${t} match: ${term}`);e.candidates=rows.map(x=>({id:x.id,code:x.code,name:x.name}));throw e;
}
export async function audit(db,action,entity,id,actor,before,after){await db.query('insert into audit_events(action,entity,record_id,actor,before_state,after_state) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)',[action,entity,id,required(actor,'actor'),before?JSON.stringify(before):null,JSON.stringify(after)]);}
export async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const out=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return out;}catch(e){await db.exec('ROLLBACK');throw e;}}
export async function add(db,kind,input,actor){
 const spec=entities[kind];if(!spec)throw Error(`Unknown add kind: ${kind}`);
 const data={...input};for(const k of Object.keys(data))if(!spec.fields.includes(k))throw Error(`Unknown ${kind} field: ${k}`);
 for(const k of spec.required)required(data[k],k);
 for(const [k,v] of Object.entries(data)){
  if(k.endsWith('_on'))date(v);
  else if(k==='verification_days'){if(!Number.isInteger(Number(v))||Number(v)<1||Number(v)>365)throw Error('verification_days must be 1 to 365');data[k]=Number(v);}
  else if(typeof v!=='string')throw Error(`${k} must be text`);
 }
 for(const [k,t] of Object.entries(spec.links||{}))data[k]=(await resolve(db,t,data[k])).id;
 if(kind==='credential')data.evidence_ref??='';
 if(kind==='appointment'){
  const [p]=await db.query('select * from providers where id=$1',[data.provider_id]);
  const [s]=await db.query('select * from sites where id=$1',[data.site_id]);
  if(p.jurisdiction!==s.jurisdiction)throw Error('Provider and site jurisdictions must match; scope cross-border arrangements separately');
 }
 if(kind==='requirement'){
  const [s]=await db.query('select * from sites where id=$1',[data.site_id]);
  if((data.kind==='nz-apc'&&s.jurisdiction!=='NZ')||(data.kind==='au-registration'&&s.jurisdiction!=='AU'))throw Error('Requirement jurisdiction mismatch');
 }
 const cols=Object.keys(data);const [row]=await db.query(`insert into ${spec.table}(${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data));
 await audit(db,'add',spec.table,row.id,actor,null,row);return row;
}
export const reads={
 providers:'select code,name,jurisdiction,profession,owner,active from providers order by code',
 sites:'select code,name,jurisdiction from sites order by code',
 credentials:'select code,provider,kind,reference,expires_on,checked_on,verification_result from credential_register order by provider,kind',
 requirements:'select s.code as site,r.profession,r.kind,r.verification_days from requirements r join sites s on s.id=r.site_id order by s.code,r.kind',
 appointments:'select appointment,provider,site,status,starts_on,ends_on,gaps from site_readiness order by appointment',
 tasks:'select t.code,p.name as provider,t.title,t.due_on,t.owner,t.status from tasks t join providers p on p.id=t.provider_id order by t.due_on,t.code',
 'renewals-due':'select * from renewal_queue order by days_left,code',
 'verification-due':`select code,provider,kind,checked_on,verification_result from credential_register where active and (checked_on is null or checked_on<CURRENT_DATE-30 or verification_result<>'current') order by checked_on nulls first,code`,
 'committee-pack':`select appointment,provider,site,status,gaps,findings from site_readiness where status in ('pending','approved','paused') order by gaps desc,appointment`,
 dashboard:`select site,status,count(*)::integer as appointments,sum(gaps)::integer as record_gaps from site_readiness group by site,status order by site,status`,
 attention:`select 'appointment' as type,appointment as code,provider,owner,findings as issue from site_readiness where status<>'ended' and gaps>0
 UNION ALL select 'task',t.code,p.name,t.owner,t.title from tasks t join providers p on p.id=t.provider_id where t.status='open' and t.due_on<CURRENT_DATE order by type,code`,
 compliance:`select appointment,provider,site,kind,finding,
 case when kind='nz-apc' then 'NZ-MED-APC' when kind='au-registration' then 'AU-REGISTER' else 'SITE-POLICY' end as rule
 from appointment_checks where status<>'ended' order by appointment,kind`,
 history:'select action,entity,actor,created_at from audit_events order by created_at,id'
};
export const questions=[
 ['Which sites have the most gaps before their next committee review?',reads.dashboard],
 ['Which providers have a practising certificate due within sixty days?',`select code,provider,owner,expires_on,days_left from renewal_queue where kind='nz-apc' order by days_left`],
 ['Which Australian registrations need a live register check after the recorded expiry?',`select code,provider,expires_on,verification_result from credential_register where kind='au-registration' and days_left<0 order by code`],
 ['Which site appointments have no indemnity evidence?',`select appointment,provider,site,finding from appointment_checks where kind='indemnity' and finding in ('Missing credential','Missing document evidence') order by appointment`],
 ['Who owns overdue requests for credential evidence?',`select t.owner,count(*)::integer as overdue from tasks t where status='open' and due_on<CURRENT_DATE group by owner order by owner`],
 ['Which pending appointments have completed their recorded checks?',`select appointment,provider,site from site_readiness where status='pending' and gaps=0 order by appointment`],
 ['Which approved appointments have developed new record gaps?',`select appointment,provider,site,findings from site_readiness where status='approved' and gaps>0 order by appointment`],
 ['Which credentials have never been independently checked?',`select code,provider,kind from credential_register where checked_on is null order by code`],
 ['Which providers appear at more than one site?',`select p.code,p.name,count(distinct a.site_id)::integer as sites from providers p join appointments a on a.provider_id=p.id where a.status<>'ended' group by p.code,p.name having count(distinct a.site_id)>1 order by p.code`],
 ['Which register conditions still need a recorded scope review?',`select appointment,provider,site,credential from appointment_checks where finding='Conditions need scope review' order by appointment`]
];
export function human(data){
 if(Array.isArray(data)){if(!data.length)return '(none)';if(data[0]?.question)return data.map(x=>x.question+'\n'+human(x.rows)).join('\n\n');return table(data,Object.keys(data[0]).map(key=>({key,label:key.replaceAll('_',' '),format:v=>typeof v==='object'&&v!==null?JSON.stringify(v):v})));}
 if(data&&typeof data==='object')return Object.entries(data).map(([k,v])=>`${k}\n${Array.isArray(v)?human(v):typeof v==='object'&&v!==null?human(v):String(v??'')}`).join('\n');return String(data);
}
export async function readProvider(db,term){const p=await resolve(db,'providers',term);return {provider:p,credentials:await db.query('select * from credential_register where provider_id=$1 order by code',[p.id]),appointments:await db.query('select * from site_readiness where appointment_id in (select id from appointments where provider_id=$1) order by appointment',[p.id]),tasks:await db.query('select * from tasks where provider_id=$1 order by due_on',[p.id]),notes:await db.query('select body,actor,created_at from notes where provider_id=$1 order by created_at',[p.id])};}
export async function mutate(db,cmd,term,f){
 const actor=required(f.actor,'actor');
 if(cmd==='add'){const input=JSON.parse(fs.readFileSync(required(f.file,'file'),'utf8'));return add(db,term,input,actor);}
 if(cmd==='verify'){
  const c=await resolve(db,'credentials',term);const checked=date(required(f.checked,'checked'));if(checked>new Date().toISOString().slice(0,10))throw Error('Verification cannot be future dated');
  const [row]=await db.query('insert into verifications(credential_id,checked_on,result,source,actor,note) values($1,$2,$3,$4,$5,$6) returning *',[c.id,checked,required(f.result,'result'),required(f.source,'source'),actor,f.note||'']);
  await audit(db,'verify','verifications',row.id,actor,null,row);return row;
 }
 if(cmd==='renew'){
  const before=await resolve(db,'credentials',term);const issued=date(required(f.issued,'issued'));const expires=date(required(f.expires,'expires'));
  if(expires<=String(before.expires_on))throw Error('Renewal must extend expiry; add a separate credential for another authority');
  const [row]=await db.query('update credentials set issued_on=$2,expires_on=$3,evidence_ref=$4 where id=$1 returning *',[before.id,issued,expires,required(f.evidence,'evidence')]);
  // A renewed document needs new verification. Keep the original checks in history, with an explicit new unverified state.
  await db.query("insert into verifications(credential_id,checked_on,result,source,actor,note) values($1,CURRENT_DATE,'not-found',$2,$3,'Renewed document awaiting independent verification')",[before.id,f.evidence,actor]);
  await audit(db,'renew','credentials',row.id,actor,before,row);return row;
 }
 if(['approve','pause','end'].includes(cmd)){
  const before=await resolve(db,'appointments',term);if(before.status==='ended')throw Error('Ended appointment cannot change');
  const evidence=required(f.evidence,'evidence');
  if(cmd==='approve'){
   await db.query('update appointments set scope_review_ref=$2 where id=$1',[before.id,f['scope-review']||before.scope_review_ref]);
   const [p]=await db.query('select * from providers where id=$1',[before.provider_id]);
   const mandatory=p.jurisdiction==='AU'?'au-registration':p.profession==='medical'?'nz-apc':null;
   if(!mandatory)throw Error('NZ non-medical professions need a separately reviewed rule set before approval');
   const check=await db.query('select * from appointment_checks where appointment_id=$1',[before.id]);
   if(!check.some(c=>c.kind===mandatory))throw Error('Missing mandatory registration requirement');
   const gaps=check.filter(c=>c.finding!=='Recorded checks complete');if(gaps.length)throw Error(`Approval blocked: ${gaps.map(c=>c.kind+': '+c.finding).join('; ')}`);
  }
  const status={approve:'approved',pause:'paused',end:'ended'}[cmd];
  const [row]=await db.query('update appointments set status=$2,decision_ref=$3,decision_by=$4,decision_at=now() where id=$1 returning *',[before.id,status,evidence,actor]);
  await audit(db,cmd,'appointments',row.id,actor,before,row);return row;
 }
 if(cmd==='complete'){
  const before=await resolve(db,'tasks',term);if(before.status==='done')throw Error('Task already completed');
  const [row]=await db.query("update tasks set status='done',completion_ref=$2 where id=$1 returning *",[before.id,required(f.evidence,'evidence')]);await audit(db,'complete','tasks',row.id,actor,before,row);return row;
 }
 if(cmd==='log'){
  const p=await resolve(db,'providers',term);const [row]=await db.query('insert into notes(provider_id,body,actor) values($1,$2,$3) returning *',[p.id,required(f.text,'text'),actor]);await audit(db,'log','notes',row.id,actor,null,row);return row;
 }
 throw Error('Unknown mutation');
}

// Configured Salesforce Details Only reports. Stable report IDs survive name changes.
export const importSpecs=[
 {file:'providers.csv',kind:'provider',map:{'Provider ID':'code','Provider Name':'name','Country':'jurisdiction','Profession':'profession','Owner':'owner'}},
 {file:'sites.csv',kind:'site',map:{'Site ID':'code','Site Name':'name','Country':'jurisdiction'}},
 {file:'credentials.csv',kind:'credential',map:{'Credential ID':'code','Provider ID':'provider_id','Kind':'kind','Registration Number':'reference','Issue Date':'issued_on','Expiry Date':'expires_on','Evidence Reference':'evidence_ref'}},
 {file:'appointments.csv',kind:'appointment',map:{'Appointment ID':'code','Provider ID':'provider_id','Site ID':'site_id','Start Date':'starts_on','End Date':'ends_on'}}
];
export async function importSalesforce(db,dir,actor,dry){
 required(dir,'dir');required(actor,'actor');const supplied=fs.readdirSync(dir).filter(x=>x.toLowerCase().endsWith('.csv'));
 const unexpected=supplied.filter(x=>!importSpecs.some(s=>s.file===x));if(unexpected.length)throw Error(`Unsupported CSV files: ${unexpected.join(', ')}`);
 if(!supplied.length)throw Error('No supported CSV files');
 return transaction(db,async()=>{
  const counts=[];for(const spec of importSpecs){const file=path.join(dir,spec.file);if(!fs.existsSync(file))continue;
   const rows=parseCsv(fs.readFileSync(file,'utf8'));if(!rows.length)throw Error(`${spec.file} has no data rows`);
   let inserted=0,unchanged=0;
   const ids=new Set();for(const raw of rows){
    for(const header of Object.keys(spec.map))if(!Object.keys(raw).some(k=>k.toLowerCase()===header.toLowerCase()))throw Error(`${spec.file}: missing ${header}`);
    const data=Object.fromEntries(Object.entries(spec.map).map(([k,v])=>[v,pick(raw,k)]));required(data.code,'source ID');
    if(ids.has(data.code))throw Error(`${spec.file}: duplicate source ID ${data.code}`);ids.add(data.code);
    const [existing]=await db.query('select * from source_rows where source_file=$1 and source_id=$2',[spec.file,data.code]);
    if(existing){const same=Object.keys(raw).length===Object.keys(existing.raw_row).length&&Object.keys(raw).every(k=>raw[k]===existing.raw_row[k]);if(!same)throw Error(`Changed source row ${spec.file}:${data.code}; reconcile explicitly`);unchanged++;continue;}
    const row=await add(db,spec.kind,data,actor);
    await db.query('insert into source_rows(source_file,source_id,local_table,local_id,raw_row) values($1,$2,$3,$4,$5::jsonb)',[spec.file,data.code,entities[spec.kind].table,row.id,JSON.stringify(raw)]);inserted++;
   }
   counts.push({file:spec.file,inserted,unchanged});
  }return {dry_run:dry,files:counts};
 },dry);
}
export async function run(db,args){
 const f={},pos=[];for(let i=0;i<args.length;i++){const a=args[i];if(a.startsWith('--')){const eq=a.indexOf('=');if(eq>0)f[a.slice(2,eq)]=a.slice(eq+1);else if(['json','dry-run','help'].includes(a.slice(2)))f[a.slice(2)]=true;else {if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`Missing value for ${a}`);f[a.slice(2)]=args[++i];}}else pos.push(a);}
 const [cmd='help',term]=pos;
 const allowed={add:['file','actor'],verify:['checked','result','source','actor','note'],renew:['issued','expires','evidence','actor'],approve:['evidence','scope-review','actor'],pause:['evidence','actor'],end:['evidence','actor'],complete:['evidence','actor'],log:['text','actor'],import:['dir','actor','dry-run'],export:['out'],'draft-renewal':[], 'draft-committee':[], 'weekly-review':[]};
 for(const k of Object.keys(f))if(!['json','help'].includes(k)&&!(allowed[cmd]||[]).includes(k))throw Error(`Unknown flag --${k} for ${cmd}`);
 if(pos.length>2)throw Error('Unexpected positional arguments');
 if(cmd==='help'||f.help)return {commands:[...Object.keys(reads),'provider','insights',...Object.keys(allowed)].join(', '),guide:'docs/cli.md'};
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='provider')return readProvider(db,term);
 if(cmd==='insights'){const out=[];for(const [question,sql]of questions)out.push({question,rows:await db.query(sql)});return out;}
 if(['add','verify','renew','approve','pause','end','complete','log'].includes(cmd))return transaction(db,()=>mutate(db,cmd,term,f));
 if(cmd==='import'){if(term!=='salesforce')throw Error('Use import salesforce');return importSalesforce(db,f.dir,f.actor,Boolean(f['dry-run']));}
 if(cmd==='export'){
  const out={format:'provider-credentials/v1',exported_at:new Date().toISOString(),records:{}};
  for(const t of tables)out.records[t]=await db.query(`select * from ${t} order by id`);
  if(f.out){fs.writeFileSync(f.out,JSON.stringify(out,null,2)+'\n');return {file:path.resolve(f.out),counts:Object.fromEntries(tables.map(t=>[t,out.records[t].length]))};}return out;
 }
 if(['weekly-review','draft-renewal','draft-committee'].includes(cmd)){
  let content,label=cmd;
  if(cmd==='weekly-review')content={attention:await db.query(reads.attention),dashboard:await db.query(reads.dashboard),compliance:await db.query(reads.compliance)};
  if(cmd==='draft-renewal'){const p=await resolve(db,'providers',term);label+='-'+p.code;content={provider:p.name,renewals:await db.query('select code,kind,expires_on,days_left from credential_register where provider_id=$1 and active and days_left<=60 order by expires_on',[p.id]),tasks:await db.query("select title,due_on,status from tasks where provider_id=$1 and status='open' order by due_on",[p.id])};}
  if(cmd==='draft-committee')content=await db.query(reads['committee-pack']);
  const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,label.replace(/[^a-zA-Z0-9_-]/g,'_')+'-'+Date.now()+'.md');
  fs.writeFileSync(file,'# DRAFT: '+label+'\n\nFor operator review. No eligibility decision or message has been sent.\n\n```text\n'+human(content)+'\n```\n');return {file};
 }
 throw Error(`Unknown command: ${cmd}`);
}
