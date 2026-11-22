import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,xp} from '../src/features/achievements/lib/game-model.js';
import {setLocale,currentLocale,loadLanguage,switchLanguage} from '../src/features/achievements/lib/locale.js';
import {createViews,questSettingsDialog} from '../src/features/achievements/ui/views.js';
import {rewardDialog} from '../src/features/achievements/ui/reward-view.js';
import {requestQuest} from '../src/features/achievements/lib/quest-api.js';

test('switching persists only the language and renders the saved board, badges and settings in either language', () => {
  const s=freshState(),g=s.goals[0],c=g.chapters[0];
  c.tasks[0].completed=true;
  c.tasks[1].title='保留我的自定义任务';
  const saved=JSON.stringify(s),earned=xp(g);
  const values=new Map([['achievement-unlocked-prototype-v1',saved]]);
  global.window={localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};
  const v=createViews({s,chapter:()=>c,shownProgress:n=>n,getOnlyCompleted:()=>false,getAchievementTab:()=>'all',getRustPreview:()=>false});
  try {
    loadLanguage();
    assert.match(v.header(g),/Switch to English/);
    assert.match(v.dashboard(g),/每个目标/);
    switchLanguage();
    setLocale('zh');loadLanguage();
    assert.equal(currentLocale(),'en');
    assert.match(v.header(g),/切换到中文/);
    assert.match(v.dashboard(g),/Every goal is a /);
    assert.match(v.dashboard(g),/Identify and write all 26 letters/);
    assert.match(v.dashboard(g),/保留我的自定义任务/);
    assert.match(v.settingsPage(g),/Local Storage/);
    assert.match(v.achievementsPage(g),/Secret condition/);
    assert.match(questSettingsDialog(g,true),/Confirm deletion/);
    assert.match(rewardDialog({stage:3,spin:0},c,earned,true),/Draw a shard|Draw shard/);
    switchLanguage();
    assert.match(v.dashboard(g),/字母与发音/);
    assert.equal(JSON.stringify(s),saved);
    assert.equal(values.get('achievement-unlocked-prototype-v1'),saved);
    assert.equal(xp(g),earned);
  } finally {delete global.window;setLocale('zh');}
});

test('AI requests use the selected language even when the goal is written in another language', async t=>{
  global.location={pathname:'/achievement'};
  let body,url;
  t.mock.method(global,'fetch',async (target,init)=>{
    url=target;body=JSON.parse(init.body);
    return {ok:true,json:async()=>({data:{}})};
  });
  try {
    for(const lang of ['en','zh']){
      setLocale(lang);
      for(const path of ['goals/generate','chapters/generate','achievements/evaluate']){
        await requestQuest(path,{goal:lang==='en'?'学习英语':'Learn English'});
        assert.equal(body.language,lang);
        assert.equal(url,'/achievement/api/'+path);
      }
    }
  } finally {delete global.location;setLocale('zh');}
});
