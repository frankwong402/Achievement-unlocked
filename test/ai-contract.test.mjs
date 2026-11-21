import test from "node:test";
import assert from "node:assert/strict";
import {validateGoalInput,validateGoalOutput,validateChapterInput,validateChapterOutput,validateEvaluationInput,validateEvaluationOutput,parseModelJson} from "../src/lib/ai/schema.mjs";
test("goal input accepted",()=>{
  assert.equal(validateGoalInput({goal:"Learn English",language:"en"}).language,"en");
  assert.throws(()=>validateGoalInput({goal:""}));
});
test("goal output has fixed core schema",()=>{
  const x=validateGoalOutput({title:"English",chapters:[{title:"Start",description:"Learn letters"}],hiddenAchievements:[{title:"Surprise",description:"Unexpected",condition:"Complete 3 tasks"}]});
  assert.equal(x.chapters.length,1);
  assert.equal(x.hiddenAchievements[0].kind,"semantic");
  assert.deepEqual(x.metadata,{});
});
test("chapter tasks are unique and normalized",()=>{
  const raw={tasks:[{title:"Letters",description:"Learn the alphabet",difficulty:"easy",achievementTitle:"ABC",completionCriteria:"Write all letters"}],hasMore:true};
  assert.equal(validateChapterOutput(raw).tasks[0].difficulty,"easy");
  assert.throws(()=>validateChapterOutput({...raw,tasks:[raw.tasks[0],raw.tasks[0]]}));
  assert.throws(()=>validateChapterOutput({...raw,tasks:[{...raw.tasks[0],difficulty:"ultra"}]}));
});
test("client input protects the existing task list",()=>{
  const x=validateChapterInput({goal:"Learn English",chapter:"Basics",existingTasks:[{title:"ABC",completed:true}]});
  assert.equal(x.existingTasks[0].completed,true);
});
test("hidden decisions can only refer to known achievements",()=>{
  const candidates=[{id:"abc"}];
  assert.deepEqual(validateEvaluationOutput({decisions:[{id:"abc",unlocked:false}]},candidates).decisions,[{id:"abc",unlocked:false}]);
  assert.throws(()=>validateEvaluationOutput({decisions:[{id:"unknown",unlocked:true}]},candidates));
});
test("evaluation validation rejects missing task list",()=>{
  assert.throws(()=>validateEvaluationInput({goal:"Learn English",achievements:[{id:"a",title:"test",condition:"learn"}]}));
});
test("no JSON repair",()=>{
  assert.deepEqual(parseModelJson('{"ok":true}'),{ok:true});
  assert.throws(()=>parseModelJson('```json\n{"ok":true}\n```'));
});

import {completeJson} from "../src/lib/ai/provider.mjs";
import {POST as postGoal} from "../src/app/api/goals/generate/route.js";
import {GET as getStatus} from "../src/app/api/ai/status/route.js";
test("live provider fails closed without Vercel activation",async()=>{
  const previous=process.env.AI_LIVE_ENABLED;
  process.env.AI_LIVE_ENABLED="false";
  try {
    await assert.rejects(completeJson([],(x)=>x),e=>e.code==="AI_DISABLED"&&e.status===503);
  } finally {
    if(previous===undefined)delete process.env.AI_LIVE_ENABLED;
    else process.env.AI_LIVE_ENABLED=previous;
  }
});
test("goal endpoint returns structured AI_DISABLED error, without spending tokens",async()=>{
  const previous=process.env.AI_LIVE_ENABLED;
  process.env.AI_LIVE_ENABLED="false";
  try {
    const request=new Request("https://example.test/api/goals/generate",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({goal:"Learn English"})
    });
    const response=await postGoal(request);
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,"AI_DISABLED");
  } finally {
    if(previous===undefined)delete process.env.AI_LIVE_ENABLED;
    else process.env.AI_LIVE_ENABLED=previous;
  }
});
test("status endpoint is safe and does not disclose API Key",async()=>{
  const response=await getStatus();
  const content=await response.text();
  assert.equal(response.status,200);
  assert.ok(!content.includes("AIHUBMIX_API_KEY"));
  assert.equal(JSON.parse(content).ai.model.length>0,true);
});
test("incomplete AI decisions cannot unlock hidden achievements",()=>{
  assert.throws(()=>validateEvaluationOutput({decisions:[]},[{id:"a"}]));
});
