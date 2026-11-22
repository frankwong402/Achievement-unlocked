import {label, currentLocale} from './locale.js';
import {chapterFactory, makeTask} from './game-model.js';
import {id} from './utils.js';

export const isLiveGoal = goal => goal.metadata?.source === 'deepseek-v4-flash';
export async function requestQuest(path, input) {
  const prefix = /^\/achievement(?:\/|$)/.test(location.pathname) ? '/achievement' : '';
  let response;
  try {
    response = await fetch(prefix + '/api/' + path, {
      method:'POST', headers:{'Content-Type':'application/json'},
      signal:AbortSignal.timeout(85000), body:JSON.stringify({...input,language:currentLocale()})
    });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? label("生成超时，请重试。", "Generation timed out. Please retry.") : label("无法连接 AI，请检查网络后重试。", "Could not connect to AI. Check your connection and retry."));
  }
  let envelope;
  try { envelope = await response.json(); }
  catch { throw new Error(label("服务返回了无法识别的内容，请重试。", "The service returned an unreadable response. Please retry.")); }
  if (!response.ok || !envelope?.data) throw new Error(requestError(envelope?.error));
  return envelope.data;
}
function requestError(error) {
  switch(error?.code) {
    case 'BUDGET_LIMIT': return label('本场 AI 额度已用完。已有 Quest 仍可使用。','The AI budget has been used up. Your saved quests are still available.');
    case 'RATE_LIMIT': case 'LOCAL_RATE_LIMIT': case 'AI_RATE_LIMIT': case 'BUDGET_BUSY':
      return label('请求过于频繁，请稍后重试。','Too many requests. Wait a moment and retry.');
    case 'AI_DISABLED': case 'AI_NOT_CONFIGURED': case 'AI_AUTH_ERROR': case 'AI_CONFIG_ERROR': case 'BUDGET_OFFLINE':
      return label('AI 服务暂不可用。已有 Quest 仍可使用。','AI is currently unavailable. You can still use saved quests.');
    case 'AI_TIMEOUT': return label('生成超时，请重试。','Generation timed out. Please retry.');
    case 'INVALID_INPUT': case 'PAYLOAD_TOO_LARGE': case 'CONTEXT_LIMIT':
      return label('输入内容未被接受，请缩短或调整后重试。','The input could not be accepted. Shorten or revise it and retry.');
    case 'INVALID_SCHEMA': case 'INVALID_AI_RESPONSE':
      if (error.message?.includes('全部重复')) return label('本批任务全部重复，请重试。','All returned tasks were duplicates. Please retry.');
      return label('AI 返回的数据格式有误，请重试。','The AI returned an invalid response. Please retry.');
    default: return label('AI 请求未完成，请重试。','The AI request failed. Please retry.');
  }
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
    if(titles.has(key(row.title))) throw new Error(label("AI 返回了重复任务，请重试。", "The AI returned duplicate tasks. Please retry."));
    titles.add(key(row.title));
    return {...makeTask([row.title,row.description,row.difficulty,row.achievementTitle]),
      completionCriteria:row.completionCriteria, locales:row.locales, metadata:{source:'deepseek-v4-flash'}};
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
