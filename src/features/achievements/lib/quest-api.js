import {chapterFactory, makeTask} from './game-model.js';
import {id} from './utils.js';

export const isLiveGoal = goal => goal.metadata?.source === 'deepseek-v4-flash';
export async function requestQuest(path, input) {
  const prefix = /^\/achievement(?:\/|$)/.test(location.pathname) ? '/achievement' : '';
  let response;
  try {
    response = await fetch(prefix + '/api/' + path, {
      method:'POST', headers:{'Content-Type':'application/json'},
      signal:AbortSignal.timeout(85000), body:JSON.stringify(input)
    });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? '生成超时，请重试。' : '无法连接 AI，请检查网络后重试。');
  }
  let envelope;
  try { envelope = await response.json(); }
  catch { throw new Error('服务返回了无法识别的内容，请重试。'); }
  if (!response.ok || !envelope.data) throw new Error(envelope.error?.message || 'AI 请求未完成，请重试。');
  return envelope.data;
}
function hidden(row, chapterId=null) {
  return {...row, id:id(), chapterId, scope:chapterId?'chapter':'goal', xp:chapterId?100:160, unlocked:false};
}
export function generatedGoal(description, data) {
  return {id:id(), title:data.title, description, createdAt:Date.now(), metadata:{source:'deepseek-v4-flash'},
    chapters:data.chapters.map((c,i)=>chapterFactory(c.title,c.description,i)),
    hidden:data.hiddenAchievements.map(h=>hidden(h))};
}
export function mergeChapter(c, data, replace) {
  const key = text => text.normalize('NFKC').trim().toLowerCase();
  const titles = new Set(c.tasks.map(t=>key(t.title)));
  const added = data.tasks.map(row=>{
    if(titles.has(key(row.title))) throw new Error('AI 返回了重复任务，请重试。');
    titles.add(key(row.title));
    return {...makeTask([row.title,row.description,row.difficulty,row.achievementTitle]),
      completionCriteria:row.completionCriteria, metadata:{source:'deepseek-v4-flash'}};
  });
  const seen = new Set(c.hidden.map(h=>key(h.title)));
  const extra = data.hiddenAchievements.filter(h=>{
    if(seen.has(key(h.title))) return false;
    seen.add(key(h.title)); return true;
  });
  c.tasks = [...(replace ? c.tasks.filter(t=>t.completed) : c.tasks), ...added];
  c.hidden.push(...extra.map(h=>hidden(h,c.id)));
  c.generated=true; c.batches++; c.hasMore=data.hasMore;
}
export async function evaluateGoal(g,c) {
  const candidates = [...g.hidden,...c.hidden].filter(h=>h.condition);
  const tasks = g.chapters.flatMap(ch=>ch.tasks.filter(t=>t.completed).map(t=>({title:t.title, completed:true, chapterId:ch.id})));
  const decisions = [];
  for(let i=0; i<candidates.length; i+=12) {
    const result = await requestQuest('achievements/evaluate', {
      goal:g.description, tasks, achievements:candidates.slice(i,i+12).map(({id,title,condition,chapterId})=>({id,title,condition,chapterId}))
    });
    decisions.push(...result.decisions);
  }
  const newBadges=[];
  for(const d of decisions) {
    const h=candidates.find(h=>h.id===d.id);
    if(d.unlocked && !h.unlocked) newBadges.push(h.title);
    h.unlocked=d.unlocked;
  }
  return newBadges;
}
