import test from "node:test";
import assert from "node:assert/strict";
import {evilScene,advanceEvilScene,resetEvilScene,apparentProgress} from "../src/features/achievements/lib/evil-engine.mjs";

test("seven distinct interactive dark patterns are reachable",()=>{
  const state={evilMode:true},goal={id:"goal-a"};
  const stages=[evilScene(state,goal).name];
  for(let i=0;i<6;i++)stages.push(advanceEvilScene(state,goal,1000).name);
  assert.equal(new Set(stages).size,7);
  assert.ok(stages.includes("FAKE URGENCY"));
});
test("evil mode never changes earned task progress or XP",()=>{
  const state={evilMode:true},goal={id:"goal-a",xp:200,tasks:[{title:"ABC",completed:true}]};
  const before=JSON.stringify(goal);
  for(let i=0;i<9;i++)advanceEvilScene(state,goal,1000);
  assert.equal(JSON.stringify(goal),before);
  assert.equal(goal.xp,200);
});
test("rollback only changes displayed progress",()=>{
  const state={evilMode:true},goal={id:"goal-a"};
  for(let i=0;i<5;i++)advanceEvilScene(state,goal,1000);
  assert.equal(evilScene(state,goal).stage,5);
  assert.equal(apparentProgress(state,goal,100),"76");
  assert.equal(apparentProgress({...state,evilMode:false},goal,100),"100");
});
test("loop becomes even more absurdly close on next round",()=>{
  const state={evilMode:true},goal={id:"goal-a"};
  const first=evilScene(state,goal).metric;
  for(let i=0;i<7;i++)advanceEvilScene(state,goal,1000);
  const next=evilScene(state,goal).metric;
  assert.ok(next.length>first.length);
  assert.match(next,/^99\.9+%$/);
});
test("simulated countdown is time based but never affects task data",()=>{
  const state={evilMode:true},goal={id:"goal-a"};
  for(let i=0;i<6;i++)advanceEvilScene(state,goal,1000);
  assert.equal(evilScene(state,goal,1000).metric,"00:25");
  assert.equal(evilScene(state,goal,28000).metric,"00:00");
});
test("each goal keeps its own demo state; reset leaves task data",()=>{
  const state={evilMode:true};
  const a={id:"a"},b={id:"b"};
  advanceEvilScene(state,a,1000);
  assert.equal(evilScene(state,b).stage,0);
  resetEvilScene(state,a);
  assert.equal(evilScene(state,a).stage,0);
});
