import test from 'node:test';
import assert from 'node:assert/strict';
import {CALL_LIMIT,reserveInLedger} from '../src/lib/ai/budget.mjs';
import {offer,rewardStep,rewardInfo} from '../src/features/achievements/lib/reward.mjs';
import {freshState,xp} from '../src/features/achievements/lib/game-model.js';
import {generatedGoal,mergeChapter} from '../src/features/achievements/lib/quest-api.js';
import {loadState,saveState} from '../src/features/achievements/lib/storage.js';

test('global lifetime escrow survives time windows and counts failed calls',()=>{
  let state={used:0,recent:[]};
  for(let i=0;i<CALL_LIMIT;i++)state=reserveInLedger(state,'one',i*61000);
  assert.throws(()=>reserveInLedger(state,'other',Date.now()),{code:'BUDGET_LIMIT'});
});
test('client and global frequency are independent',()=>{
  let state={used:0,recent:[]};
  for(let i=0;i<8;i++)state=reserveInLedger(state,'one',0);
  assert.throws(()=>reserveInLedger(state,'one',100),{code:'RATE_LIMIT'});
  for(let i=0;i<22;i++)state=reserveInLedger(state,String(i),100);
  assert.throws(()=>reserveInLedger(state,'fresh',100),{code:'RATE_LIMIT'});
  assert.equal(reserveInLedger(state,'one',61001).used,31);
});
test('chapter reward has only virtual stamp and recalculation to 100%, without changing XP',()=>{
  const s=freshState(),g=s.goals[0],c=g.chapters[0];
  c.tasks.forEach(task=>{task.completed=true;task.achievement.unlocked=true;});
  g.hidden[0].unlocked=true;
  const before=JSON.stringify(g),earned=xp(g),receipt=offer(s,g,c);
  assert.equal(receipt.stage,0);
  assert.match(rewardInfo(receipt)[3],/盖虚拟章|Stamp/);
  rewardStep(receipt,earned,1000);
  assert.equal(receipt.stage,1);
  assert.equal(rewardInfo(receipt)[2],'99.9%');
  assert.match(rewardInfo(receipt)[3],/Recalculate/);
  rewardStep(receipt,earned,1000);
  assert.equal(receipt.stage,2);
  assert.equal(rewardInfo(receipt)[2],'100%');
  rewardStep(receipt,earned,1000);
  assert.equal(receipt.stage,2);
  assert.equal(xp(g),earned);
  assert.equal(JSON.stringify(g),before);
  const legacy={rewardOffers:{[g.id+'/'+c.id]:{stage:7,claims:1}}};
  assert.equal(offer(legacy,g,c).stage,2);
  assert.equal(offer(legacy,g,c).flowVersion,2);
});
test('regeneration commits atomically and retains completed IDs and hidden badges',()=>{
  const g=generatedGoal('Testing goals',{title:'Testing',chapters:[{title:'Start',description:'Start here'}],hiddenAchievements:[]});
  const c=g.chapters[0];const row={title:'one',difficulty:'easy',description:'d',achievementTitle:'a',completionCriteria:'c'};
  const batch={tasks:[row],hiddenAchievements:[{title:'Secret',condition:'Complete one',description:'d'}],hasMore:true};
  mergeChapter(c,batch,false);c.tasks[0].completed=true;const before=JSON.stringify(c);
  assert.throws(()=>mergeChapter(c,batch,true));assert.equal(JSON.stringify(c),before);
  const id=c.tasks[0].id;mergeChapter(c,{...batch,tasks:[{...row,title:'two'}]},true);
  assert.equal(c.tasks.length,2);assert.equal(c.tasks[0].id,id);assert.equal(c.hidden.length,1);
});
test('legacy settings and progress survive, unreadable data remains intact',()=>{
  let raw=JSON.stringify({...freshState(),evilMode:false,view:'review'});
  global.window={localStorage:{getItem:()=>raw,setItem:(_,s)=>{raw=s;}}};
  const state=loadState();assert.equal(state.evilMode,false);assert.equal(state.view,'dashboard');
  state.goals[0].chapters[0].tasks[0].completed=true;saveState(state);assert.equal(xp(loadState().goals[0]),100);
  raw='{';const recovering=loadState();assert.throws(()=>saveState(recovering));assert.equal(raw,'{');delete global.window;
});

import {chapterAudit, patinaLabel} from '../src/features/achievements/lib/reward.mjs';
import {rewardDialog} from '../src/features/achievements/ui/reward-view.js';
import {requestCompletion} from '../src/lib/ai/provider.mjs';
import {validateGoalOutput} from '../src/lib/ai/schema.mjs';

test('chapter completion dialog shows only a stamp and a final 100 percent receipt',()=>{
  const state=freshState(), goal=state.goals[0], chapter=goal.chapters[0];
  const receipt=offer(state,goal,chapter);
  assert.equal(chapterAudit(chapter),null);
  chapter.tasks.forEach(task=>{task.completed=true;task.achievement.unlocked=true;});
  const before=JSON.stringify(goal);
  assert.deepEqual(chapterAudit(chapter),{total:3,hard:0,challenge:true});
  const stamp=rewardDialog(receipt,chapter,xp(goal),true);
  assert.match(stamp,/virtual-seal/);
  assert.match(stamp,/data-action="reward-step"/);
  assert.doesNotMatch(stamp,/audit-answer|data-evil-clock|draw-slot/);
  rewardStep(receipt);
  const recalculation=rewardDialog(receipt,chapter,xp(goal),true);
  assert.match(recalculation,/99\.9%/);
  assert.match(recalculation,/Recalculate/);
  rewardStep(receipt);
  const complete=rewardDialog(receipt,chapter,xp(goal),true);
  assert.match(complete,/100%/);
  assert.match(complete,/recalculate-complete/);
  assert.doesNotMatch(complete,/data-action="reward-step"/);
  assert.match(rewardDialog(receipt,chapter,xp(goal),false),/100%/);
  assert.equal(JSON.stringify(goal),before);
  assert.deepEqual([0,42000,84000].map(time=>patinaLabel(0,time)),['闪耀','氧化中','已氧化']);
});
test('provider returns typed errors for timeout, authorization and invalid model JSON',async()=>{
  const config={base:'https://example.test',messages:[],maxTokens:100};
  const scenarios=[
    [()=>{throw new DOMException('Timed out','AbortError');},'AI_TIMEOUT',504],
    [()=>new Response('',{status:403}),'AI_AUTH_ERROR',502],
    [()=>Response.json({choices:[{message:{content:'oops'}}]}),'INVALID_AI_RESPONSE',502],
    [()=>Response.json({choices:[{message:{content:'{}'}}]}),'INVALID_AI_RESPONSE',502],
    [()=>new Response('bad envelope'),'INVALID_AI_RESPONSE',502],
  ];
  for(const [fetcher,code,status] of scenarios)
    await assert.rejects(requestCompletion(config,validateGoalOutput,fetcher),{code,status});
});

import {hiddenHint} from '../src/features/achievements/lib/game-model.js';

test('older public hints keep their flavor without displaying unlock instructions',()=>{
  const h={title:'初识手冲', condition:'本章完成一项任务', description:'完成本章第一个任务。'};
  assert.doesNotMatch(hiddenHint(h),/完成|任务/);
  h.description='咖啡香钻出了杯沿。';
  assert.equal(hiddenHint(h), h.description);
  assert.equal(h.condition,'本章完成一项任务');
});

import {validateChapterBatch} from '../src/lib/ai/schema.mjs';

test('mixed follow-up batches keep new tasks and all-repeat batches fail before persistence',()=>{
  const row={title:'Beans',description:'Identify beans',difficulty:'easy',achievementTitle:'Bean scout',completionCriteria:'List two varieties'};
  const old=[{title:'ＢＥＡＮＳ',completed:true}];
  const batch=validateChapterBatch({tasks:[row,{...row,title:'Brew'}]},old);
  assert.deepEqual(batch.tasks.map(t=>t.title),['Brew']);
  assert.throws(()=>validateChapterBatch({tasks:[row]},old),{code:'INVALID_AI_RESPONSE',status:502});
  assert.equal(old[0].completed,true);
});
