// Explicit release check only. Never imported by an HTTP route or by npm test.
import assert from 'node:assert/strict';
import {POST as goalRoute} from '../src/app/api/goals/generate/route.js';
import {POST as chapterRoute} from '../src/app/api/chapters/generate/route.js';
import {POST as evaluateRoute} from '../src/app/api/achievements/evaluate/route.js';
if (process.env.AU_BUILD_PROBE !== '1') throw new Error('Release probe must be explicitly selected');
process.env.AI_LIVE_ENABLED='true';
async function call(route, input) {
  const res=await route(new Request('https://release.test/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input)}));
  const data=await res.json();
  if(!res.ok) throw new Error('Probe failed: '+data.error.code+' '+data.error.message);
  return data.data;
}
const goal='从零开始学习用英语在咖啡店点单，最后独立完成一次对话。';
const roadmap=await call(goalRoute,{goal});
const first=roadmap.chapters[0];
const batch=await call(chapterRoute,{goal,chapter:first.title,chapterDescription:first.description});
assert.ok(roadmap.hiddenAchievements.length && batch.hiddenAchievements.length);
const criteria={id:'first',title:'First order',condition:'At least one recorded task is complete'};
for(const completed of [true,false]) {
  const data=await call(evaluateRoute,{goal,tasks:[{title:batch.tasks[0].title,completed}],achievements:[criteria]});
  assert.equal(data.decisions[0].unlocked,completed);
}
console.info('Release probe passed',JSON.stringify({chapters:roadmap.chapters.length,tasks:batch.tasks.length,unlock:true,relock:true}));
