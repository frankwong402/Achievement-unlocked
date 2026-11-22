import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState, xp} from '../src/features/achievements/lib/game-model.js';
import {renameQuest,deleteQuest} from '../src/features/achievements/lib/quest-settings.js';
import {loadState, saveState} from '../src/features/achievements/lib/storage.js';
import {createViews, questSettingsDialog} from '../src/features/achievements/ui/views.js';

test('settings target the quest ID even when names match', () => {
  const state = freshState();
  const keep = freshState().goals[0];
  keep.chapters[0].tasks[0].completed = true;
  const target = state.goals[0];
  state.goals.push(keep);
  state.rewardOffers = {[target.id+'/first']:{claims:1}, [keep.id+'/first']:{claims:2}};
  const renamed = renameQuest(state,target.id,'  New Quest  ');
  assert.equal(renamed.goals[0].title,'New Quest');
  assert.equal(renamed.goals[1],keep);
  assert.equal(renamed.goals[0].chapters,target.chapters);
  assert.throws(()=>renameQuest(state,target.id,'  '));
  assert.throws(()=>deleteQuest(state,'missing'));
  const after = deleteQuest(renamed,target.id);
  assert.deepEqual(after.goals,[keep]);
  assert.equal(after.selectedChapterId,keep.chapters[0].id);
  assert.equal(after.selectedGoalId,keep.id);
  assert.equal(xp(after.goals[0]),100);
  assert.deepEqual(after.rewardOffers,{[keep.id+'/first']:{claims:2}});
});

test('delete confirmation escapes the title and provides a cancel action', () => {
  const goal={title:'<Coffee & Tea>'};
  for(const confirming of [false,true]) {
    const html=questSettingsDialog(goal,confirming);
    assert.ok(html.includes('&lt;Coffee &amp; Tea&gt;'));
    assert.ok(html.includes('取消'));
    assert.equal(html.includes('data-action="confirm-delete-quest"'),confirming);
  }
});

test('last quest deletion persists an empty board and stale tabs cannot resurrect it', () => {
  let raw=null;
  global.window={localStorage:{getItem:()=>raw,setItem:(_,value)=>{raw=value;}}};
  try {
    const state=loadState();saveState(state);
    const stale=loadState();
    const empty=deleteQuest(state,state.selectedGoalId);
    saveState(state,empty);
    assert.throws(()=>saveState(stale),/刷新/);
    const restored=loadState();
    assert.deepEqual(restored.goals,[]);
    assert.equal(restored.selectedGoalId,null);
    assert.equal(restored.storageReadOnly,undefined);
    const views=createViews({s:restored});
    assert.match(views.sidebar(undefined),/任务板/);
    assert.match(views.header(undefined),/新目标/);
  } finally {delete global.window;}
});
