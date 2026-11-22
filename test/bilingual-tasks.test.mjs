import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChapterBatch,validateTranslationInput,translatedTask} from '../src/lib/ai/schema.mjs';
import {taskCard} from '../src/features/achievements/ui/task-card.js';
import {taskCopies} from '../src/features/achievements/lib/task-text.js';
import {setLocale} from '../src/features/achievements/lib/locale.js';
import {mergeChapter} from '../src/features/achievements/lib/quest-api.js';
import {freshState, xp, makeTask} from '../src/features/achievements/lib/game-model.js';
import {TASKS} from '../src/features/achievements/data/mock-content.js';

const en={title:'Weigh 15 g',description:'Weigh out the coffee beans.',achievementTitle:'Scale scout',completionCriteria:'Record 15 g.'};
const zh={title:'称量 15 克',description:'称量咖啡豆。',achievementTitle:'秤上新手',completionCriteria:'记录 15 克。'};

test('the production chapter contract requires both complete copies and catches duplicates across languages',()=>{
  const row={...en,translation:zh,difficulty:'easy'};
  assert.throws(()=>validateChapterBatch({tasks:[{...row,translation:{}}]},[],'en'));
  assert.throws(()=>validateChapterBatch({tasks:[row]},[{title:zh.title}],'en'));
  const result=validateChapterBatch({tasks:[row]},[],'en');
  const goal=freshState().goals[0],chapter=goal.chapters[0];
  mergeChapter(chapter,result,false);
  const task=chapter.tasks.at(-1);task.completed=true;
  const before=JSON.stringify(task),earned=xp(goal);
  try{
    for(const lang of ['zh','en']){
      setLocale(lang);
      const html=taskCard(goal,task);
      assert.match(html,/Weigh 15 g/);assert.match(html,/称量 15 克/);
      assert.match(html,/记录 15 克/);assert.match(html,/Scale scout/);
      assert.ok(html.indexOf('lang="'+lang+'"')<html.indexOf('secondary-copy'));
      assert.equal((html.match(/data-action="complete"/g)||[]).length,1);
      assert.doesNotMatch(html,/translate-task/);
    }
  } finally {setLocale('zh');}
  assert.equal(JSON.stringify(task),before);assert.equal(xp(goal),earned);
});

test('an older mixed-language task keeps its original and only receives validated text',()=>{
  const task=makeTask([zh.title,en.description,'medium',en.achievementTitle]);
  const origin=structuredClone(task);
  assert.match(taskCard({},task),/translate-task/);
  const source=validateTranslationInput({task:{...zh,completionCriteria:''}});
  task.locales=translatedTask({zh:{...zh,xp:900},en:{...en,completed:true}},source);
  assert.equal(task.locales.zh.completionCriteria,'');assert.equal(task.locales.zh.xp,undefined);
  assert.equal(task.locales.en.completed,undefined);
  assert.throws(()=>translatedTask({zh},source));
  const saved=JSON.parse(JSON.stringify(task));
  assert.match(taskCard({},saved),/Weigh 15 g/);assert.doesNotMatch(taskCard({},saved),/translate-task/);
  delete saved.locales;assert.deepEqual(saved,origin);
});

test('every bundled IELTS task and its badge have both languages without an API call',()=>{
  const goal=freshState().goals[0];
  for(const row of TASKS.english.flat()){
    const copies=taskCopies(goal,makeTask(row));
    assert.ok(copies.zh.title!==copies.en.title && copies.zh.description!==copies.en.description);
    assert.ok(copies.zh.achievementTitle!==copies.en.achievementTitle);
  }
});

test('the public chapter endpoint dispatches translation requests through the same budgeted provider',async()=>{
  const {POST}=await import('../src/app/api/chapters/generate/route.js');
  const previous=process.env.AI_LIVE_ENABLED;
  process.env.AI_LIVE_ENABLED='false';
  try {
    const response=await POST(new Request('https://example.test/achievement/api/chapters/generate',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'translate-task',task:zh})
    }));
    assert.equal((await response.json()).error.code,'AI_DISABLED');
  } finally {
    if(previous===undefined)delete process.env.AI_LIVE_ENABLED;
    else process.env.AI_LIVE_ENABLED=previous;
  }
});
