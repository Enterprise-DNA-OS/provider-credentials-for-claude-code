import {spawnSync} from 'node:child_process';
import {REPO_ROOT} from './lib/db.mjs';
const env={...process.env,DATABASE_URL:'',DATA_DIR:'.data/demo'};
for(const args of [['scripts/migrate.mjs'],['scripts/seed.mjs'],['scripts/credentials.mjs','renewals-due'],['scripts/credentials.mjs','committee-pack'],['scripts/credentials.mjs','compliance'],['scripts/view.mjs'],['scripts/docs.mjs']]){
 const p=spawnSync(process.execPath,args,{cwd:REPO_ROOT,env,stdio:'inherit'});if(p.status!==0)process.exit(p.status||1);
}
