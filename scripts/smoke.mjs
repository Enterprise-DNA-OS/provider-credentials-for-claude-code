import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,reads,questions,entities,date} from './lib/domain.mjs';
import {parseCsv} from './lib/csv.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'provider-credentials-'));
process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=path.join(tmp,'output');process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
let bootstrap,db;const schema='test_'+Date.now();let checks=0;
const ok=(v,msg)=>{assert.ok(v,msg);checks++;};
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const fail=async(args,re)=>{await assert.rejects(()=>run(db,args),re);checks++;};
const call=(...args)=>run(db,args);
const count=async t=>Number((await db.query(`select count(*) as n from ${t}`))[0].n);
const today=new Date().toISOString().slice(0,10);
const future=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const jsonFile=(name,data)=>{const f=path.join(tmp,name+'.json');fs.writeFileSync(f,JSON.stringify(data));return f;};
function child(args,success=true){const p=spawnSync(process.execPath,args,{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(p.status,success?0:1);return p;}
try{
 if(process.env.TEST_DATABASE_URL){bootstrap=await getDb();await bootstrap.exec(`create schema ${schema}`);const url=new URL(process.env.TEST_DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);process.env.DATABASE_URL=url.href;}
 db=await getDb();await migrate(db);eq((await migrate(db)).ran.length,0);await seed(db);const baseline=await count('providers');await seed(db);eq(await count('providers'),baseline);
 ok((await call('help')).commands.includes('verify'));
 for(const cmd of Object.keys(reads)){const rows=await call(cmd,'--json');ok(Array.isArray(rows),cmd);}
 eq((await call('insights')).length,10);for(const [q,sql] of questions)ok(Array.isArray(await db.query(sql)),q);
 eq((await call('provider','mArA')).provider.code,'PR-101');eq((await call('provider','10000000-0000-4000-8000-000000000001')).provider.code,'PR-101');
 await fail(['provider','Alex'],/Ambiguous.*PR-103.*PR-104/);await fail(['provider','missing'],/No providers/);await fail(['not-a-command'],/Unknown command/);await fail(['providers','--oops'],/Missing value|Unknown flag/);
 eq((await call('provider','10000000-0000-4000-8000-000000000004')).provider.code,'PR-104');
 await fail(['approve','AP-102','--actor=Reviewer','--evidence=committee:102'],/Approval blocked/);
 const approved=await call('approve','AP-101','--actor=Reviewer','--evidence=committee:101');eq(approved.status,'approved');
 eq((await call('pause','AP-101','--actor=Reviewer','--evidence=review:hold')).status,'paused');
 eq((await call('approve','AP-101','--actor=Reviewer','--evidence=committee:reapprove')).status,'approved');
 await fail(['approve','AP-103','--actor=Reviewer','--evidence=committee:103'],/Registration date passed/);
 await fail(['verify','CR-101','--actor=Reviewer','--result=current','--source=register:101','--checked='+future(1)],/future/);
 await fail(['verify','CR-101','--actor=Reviewer','--result=current','--source=register:101','--checked=2026-02-30'],/Invalid date/);
 await fail(['verify','CR-101','--result=current','--source=register:101','--checked='+today],/actor/);
 await call('verify','CR-101','--actor=Reviewer','--result=conditions','--source=register:101','--checked='+today,'--note=Scope restriction recorded');
 await fail(['approve','AP-101','--actor=Reviewer','--evidence=committee:conditions'],/Conditions need scope review/);
 eq((await call('approve','AP-101','--actor=Reviewer','--evidence=committee:conditions','--scope-review=committee:scope')).status,'approved');
 await call('renew','CR-101','--actor=Reviewer','--issued='+today,'--expires='+future(365),'--evidence=document:new');
 await fail(['approve','AP-101','--actor=Reviewer','--evidence=committee:new'],/Register result needs review/);
 await call('verify','CR-101','--actor=Reviewer','--result=current','--source=register:new','--checked='+today);
 eq((await call('approve','AP-101','--actor=Reviewer','--evidence=committee:new')).status,'approved');
 await fail(['renew','CR-101','--actor=Reviewer','--issued='+today,'--expires='+future(10),'--evidence=x'],/extend/);
 await call('log','PR-101','--actor=Reviewer','--text=Checked original evidence');eq((await call('provider','PR-101')).notes.length,1);
 eq((await call('complete','TASK-101','--actor=Reviewer','--evidence=task:done')).status,'done');await fail(['complete','TASK-101','--actor=Reviewer','--evidence=x'],/already/);
 const payloads={provider:{code:'TEST-PR',name:'Test Provider <script>',jurisdiction:'NZ',profession:'medical',owner:'Test'},site:{code:'TEST-SITE',name:'Test Site',jurisdiction:'NZ'},credential:{code:'TEST-CR',provider_id:'TEST-PR',kind:'nz-apc',reference:'TEST-ONLY',issued_on:today,expires_on:future(100),evidence_ref:'test:document'},requirement:{site_id:'TEST-SITE',profession:'medical',kind:'nz-apc',verification_days:7},appointment:{code:'TEST-AP',provider_id:'TEST-PR',site_id:'TEST-SITE',starts_on:today,ends_on:future(300)},task:{code:'TEST-TASK',provider_id:'TEST-PR',title:'Review source',due_on:today,owner:'Test'}};
 for(const kind of Object.keys(entities))ok((await call('add',kind,'--file='+jsonFile(kind,payloads[kind]),'--actor=Test')).id,kind);
 await fail(['add','provider','--file='+jsonFile('bad',{...payloads.provider,code:'BAD',unknown:'no'}),'--actor=Test'],/Unknown provider field/);
 await fail(['add','credential','--file='+jsonFile('bad-date',{...payloads.credential,code:'BAD-CR',expires_on:'2026-02-30'}),'--actor=Test'],/Invalid date/);
 await fail(['add','appointment','--file='+jsonFile('cross',{...payloads.appointment,code:'CROSS',site_id:'SITE-AU'}),'--actor=Test'],/jurisdictions/);
 await call('verify','TEST-CR','--actor=Test','--checked='+today,'--result=current','--source=register:test');
 const missingSite=await call('add','site','--file='+jsonFile('empty-site',{code:'EMPTY-SITE',name:'No policy',jurisdiction:'NZ'}),'--actor=Test');
 await call('add','appointment','--file='+jsonFile('no-policy',{...payloads.appointment,code:'NO-POLICY',site_id:missingSite.code}),'--actor=Test');
 ok((await call('compliance')).some(x=>x.appointment==='NO-POLICY'&&x.finding==='Missing mandatory registration requirement'));
 await fail(['approve','NO-POLICY','--actor=Test','--evidence=x'],/Missing mandatory/);
 eq((await call('approve','TEST-AP','--actor=Test','--evidence=committee:test')).status,'approved');
 eq((await call('end','TEST-AP','--actor=Test','--evidence=committee:end')).status,'ended');await fail(['approve','TEST-AP','--actor=Test','--evidence=x'],/Ended/);
 const fixture=path.join(REPO_ROOT,'examples/salesforce');const before=await count('providers');
 eq((await call('import','salesforce','--dir='+fixture,'--actor=Import','--dry-run')).dry_run,true);eq(await count('providers'),before);
 const imported=await call('import','salesforce','--dir='+fixture,'--actor=Import');eq(imported.files.reduce((n,x)=>n+x.inserted,0),4);
 eq((await call('import','salesforce','--dir='+fixture,'--actor=Import')).files.reduce((n,x)=>n+x.unchanged,0),4);
 const broken=path.join(tmp,'broken');fs.mkdirSync(broken);fs.writeFileSync(path.join(broken,'providers.csv'),'Provider ID,Provider Name,Country,Profession,Owner\nROLLBACK,Rollback Test,NZ,medical,Test\n');fs.writeFileSync(path.join(broken,'credentials.csv'),'Credential ID,Provider ID,Kind,Registration Number,Issue Date,Expiry Date,Evidence Reference\nROLLBACK-CR,missing,nz-apc,x,2026-01-01,2026-12-31,x\n');
 await fail(['import','salesforce','--dir='+broken,'--actor=Import'],/No providers/);eq(await count('providers'),before+1);eq((await db.query("select * from providers where code='ROLLBACK'")).length,0);
 fs.writeFileSync(path.join(broken,'providers.csv'),'Provider ID,Provider Name,Country,Profession,Owner\nIMP-PR-1,Changed,NZ,medical,Test\n');await fail(['import','salesforce','--dir='+broken,'--actor=Import'],/Changed source/);
 fs.writeFileSync(path.join(broken,'rogue.csv'),'id\n1');await fail(['import','salesforce','--dir='+broken,'--actor=Import'],/Unsupported CSV/);
 eq(parseCsv('\ufeffID,Name\r\n1,"A, B"\r\n2,"Line\nTwo"')[1].Name,'Line\nTwo');assert.throws(()=>parseCsv('ID,id\n1,2'),/unique/);assert.throws(()=>parseCsv('ID,Name\n1,"bad'),/unclosed/);checks+=2;
 for(const cmd of ['weekly-review','draft-renewal','draft-committee']){const out=await call(cmd,...(cmd==='draft-renewal'?['PR-101']:[]));ok(fs.readFileSync(out.file,'utf8').includes('DRAFT'));}
 const all=await call('export');eq(Object.keys(all.records).length,10);ok(all.records.audit_events.length>20);ok(all.records.source_rows.every(x=>x.raw_row));
 const exported=path.join(tmp,'export.json');await call('export','--out='+exported);eq(JSON.parse(fs.readFileSync(exported)).format,'provider-credentials/v1');
 // Close the embedded DB before subprocesses access its files.
 await db.close();db=null;
 eq(JSON.parse(child(['scripts/credentials.mjs','providers','--json']).stdout).length,before+1);
 ok(JSON.parse(child(['scripts/credentials.mjs','provider','Alex','--json'],false).stderr).candidates.length===2);
 child(['scripts/view.mjs']);child(['scripts/docs.mjs']);
 ok(fs.readFileSync(path.join(process.env.OUTPUT_DIR,'views/week.html'),'utf8').includes('Site readiness'));
 const files=fs.readdirSync(path.join(process.env.OUTPUT_DIR,'docs-out/credential-file'));const html=files.map(f=>fs.readFileSync(path.join(process.env.OUTPUT_DIR,'docs-out/credential-file',f),'utf8')).join('');ok(html.includes('&lt;script&gt;'));ok(!html.includes('<script>'));
 console.log(`PASS: ${checks} assertions, every CLI command, transactional import, decision gates, audit, drafts and HTML (${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'})`);
}finally{
 if(db)await db.close();if(bootstrap){await bootstrap.exec(`drop schema ${schema} cascade`);await bootstrap.close();}fs.rmSync(tmp,{recursive:true,force:true});
}
