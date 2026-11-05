import {createRequire} from 'node:module';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
const require=createRequire(new URL('../server/package.json',import.meta.url));
const {MongoClient}=require('mongodb');
const expected=join(homedir(),'.local/share/cruisin-v2/mongo');
const client=new MongoClient('mongodb://127.0.0.1:27983/?directConnection=true',{serverSelectionTimeoutMS:3000});
await client.connect();const options=await client.db('admin').command({getCmdLineOpts:1});const hello=await client.db('admin').command({hello:1});
if(options.parsed.storage.dbPath!==expected||options.parsed.net.port!==27983||options.parsed.net.bindIp!=='127.0.0.1')throw new Error('Refusing to change an unknown local MongoDB instance');
if(!hello.setName&&!options.parsed.replication?.replSetName){const {pid}=await client.db('admin').command({serverStatus:1});await client.close();process.kill(pid,'SIGTERM');for(let i=0;i<50;i++){try{process.kill(pid,0);await new Promise(r=>setTimeout(r,100));}catch{break;}}const r=spawnSync('/opt/homebrew/opt/mongodb-community@8.0/bin/mongod',['--dbpath',expected,'--bind_ip','127.0.0.1','--port','27983','--replSet','rsCruisinV2','--logpath',join(homedir(),'.local/share/cruisin-v2/logs/mongo.log'),'--fork'],{stdio:'inherit'});if(r.status!==0)throw new Error('Failed to start isolated replica set');await client.connect();}
try{await client.db('admin').command({replSetGetStatus:1});}catch(error){if(error.code!==94)throw error;await client.db('admin').command({replSetInitiate:{_id:'rsCruisinV2',members:[{_id:0,host:'127.0.0.1:27983'}]}});}
for(let i=0;i<100;i++){const h=await client.db('admin').command({hello:1});if(h.isWritablePrimary){console.log('Isolated rsCruisinV2 primary ready on 127.0.0.1:27983');await client.close();process.exit(0);}await new Promise(r=>setTimeout(r,100));}
await client.close();throw new Error('Local primary election timed out');
