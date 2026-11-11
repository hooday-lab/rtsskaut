const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const fs=require('fs');
const {Timestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'rts-test',firestore:{rules:fs.readFileSync(require('path').resolve(__dirname,'../../firestore.rules'),'utf8'),host:'127.0.0.1',port:8080}});
 const D=864e5,now=Date.now(),T=ms=>Timestamp.fromMillis(ms);
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const id of ['stats','bg','bgV','bgS','bgSV','stats_backup_k12','history_2021','history_index'])await db.doc('data/'+id).set({x:1});
  await db.doc('settings/cards').set({a:1});
  const M={
   'crew@e.com':{role:'member'},
   'adm@e.com':{role:'admin'},
   'l0@e.com':{role:'supporter',level:0,until:T(now+5*D)},
   'l1@e.com':{role:'supporter',level:1,until:T(now+5*D)},
   'l2@e.com':{role:'supporter',level:2,until:T(now+5*D)},
   'leg@e.com':{role:'supporter',until:T(now+5*D)},
   'exp@e.com':{role:'supporter',level:2,until:T(now-1*D)},
  };
  for(const [k,v] of Object.entries(M))await db.doc('members/'+k).set(v);
 });
 const as=e=>env.authenticatedContext('u_'+e,{email:e,email_verified:true}).firestore();
 let bad=0;
 const chk=async(label,who,path,expectOk)=>{
  const db=who===null?env.unauthenticatedContext().firestore():as(who);
  try{expectOk?await assertSucceeds(db.doc(path).get()):await assertFails(db.doc(path).get());console.log('OK  ',label)}
  catch(e){bad++;console.log('FAIL',label)}
 };
 const users=['free@e.com','l0@e.com','l1@e.com','l2@e.com','leg@e.com','exp@e.com','crew@e.com','adm@e.com'];
 for(const u of users){
  await chk(u+' data/stats ok',u,'data/stats',true);
  await chk(u+' data/bgV ok',u,'data/bgV',true);
  await chk(u+' settings ok',u,'settings/cards',true);
 }
 const histOk={'free@e.com':0,'l0@e.com':0,'l1@e.com':0,'l2@e.com':1,'leg@e.com':1,'exp@e.com':0,'crew@e.com':1,'adm@e.com':1};
 for(const u of users){
  await chk(u+' history '+(histOk[u]?'ok':'zablokowana'),u,'data/history_2021',!!histOk[u]);
  await chk(u+' history_index '+(histOk[u]?'ok':'zablokowana'),u,'data/history_index',!!histOk[u]);
  const backupOk=['crew@e.com','adm@e.com'].includes(u);
  await chk(u+' backup '+(backupOk?'ok':'zablokowana'),u,'data/stats_backup_k12',backupOk);
 }
 await chk('niezalogowany data/stats zablokowany',null,'data/stats',false);
 // zapis
 for(const u of ['free@e.com','l2@e.com','crew@e.com']){
  try{await assertFails(as(u).doc('members/'+u).set({role:'admin'}));console.log('OK   samodzielne nadanie roli zablokowane',u)}catch(e){bad++;console.log('FAIL samodzielne nadanie',u)}
  try{await assertFails(as(u).doc('data/stats').set({x:2}));console.log('OK   zapis data zablokowany',u)}catch(e){bad++;console.log('FAIL zapis data',u)}
 }
 try{await assertSucceeds(as('adm@e.com').doc('members/z@e.com').set({role:'supporter',level:1}));console.log('OK   admin zapisuje członków')}catch(e){bad++;console.log('FAIL admin zapis')}
 console.log(bad?('BŁĘDY: '+bad):'WSZYSTKIE TESTY REGUŁ OK');
 await env.cleanup();
 process.exit(bad?1:0);
})();
