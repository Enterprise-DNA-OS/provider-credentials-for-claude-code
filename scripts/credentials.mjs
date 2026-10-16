#!/usr/bin/env node
import {getDb} from './lib/db.mjs';
import {run,human} from './lib/domain.mjs';
const args=process.argv.slice(2);let db;
try{db=await getDb();const result=await run(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):human(result));}
catch(e){console.error(args.includes('--json')?JSON.stringify({error:e.message,candidates:e.candidates||[]}):e.message);process.exitCode=1;}
finally{if(db)await db.close();}
