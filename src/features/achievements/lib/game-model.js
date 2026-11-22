import { CHAPTERS, TASKS, XP } from '../data/mock-content.js';
import { id } from './utils.js';

// Game objects and calculations shared by mock UI.
// Stage-2: replace mock generation with API-based structured responses.
export const makeHidden=(scope,chapterId=null)=>({id:id(),scope,chapterId,title:scope==='goal'?'Unexpected Momentum':'Silent Grinder',description:scope==='goal'?'你在不经意间迈出了重要的一步。':'有些努力，只有系统偷偷记得。',xp:scope==='goal'?160:100,unlocked:false,kind:'semantic',metadata:{source:'mock-ai'},mockRule:scope==='goal'?'goal-completed-3':'chapter-completed-3'});
export function chapterFactory(name,description,index){return{id:id(),title:name,description,index,generated:false,tasks:[],hidden:[],batches:0};}
export function typeOfGoal(text){return/英语|雅思|ielts|english/i.test(text)?'english':/程序|编程|python|开发|code/i.test(text)?'coding':/运动|健身|跑步|fitness/i.test(text)?'fitness':'general';}
export function createGoal(description,title){const type=typeOfGoal(description),parts=CHAPTERS[type];return{id:id(),title:title||description.slice(0,45),description,type,createdAt:Date.now(),chapters:parts.map((p,i)=>chapterFactory(p[0],p[1],i)),hidden:[makeHidden('goal')],metadata:{source:'mock-ai',version:1}};}
export function freshState(){const g=createGoal('我要从零基础学英语，最终达到雅思9分','从英语零基础到 IELTS 9');g.metadata.source='example';const c=g.chapters[0];c.tasks=templateFor(g,c).slice(0,3).map(makeTask);c.generated=true;c.batches=1;c.hidden=[makeHidden('chapter',c.id)];return{version:2,goals:[g],selectedGoalId:g.id,selectedChapterId:g.chapters[0].id,view:'dashboard',evilMode:true};}
export function xp(g){let total=0;g.chapters.forEach(c=>c.tasks.forEach(t=>{if(t.completed)total+=XP[t.difficulty].task+XP[t.difficulty].achievement}));const hidden=[...g.hidden,...g.chapters.flatMap(c=>c.hidden)];hidden.forEach(h=>{if(h.unlocked)total+=h.xp;});return total;}
export function getAllTasks(g){return g.chapters.flatMap(c=>c.tasks)}
export function chapterProgress(c){return c.generated&&c.tasks.length?c.tasks.filter(t=>t.completed).length/c.tasks.length*100:0;}
export function realProgress(g){return Math.round(g.chapters.reduce((sum,c)=>sum+chapterProgress(c),0)/g.chapters.length);}
export function hiddenList(g){return [...g.hidden,...g.chapters.flatMap(c=>c.hidden)];}
export function makeTask(row){return{id:id(),title:row[0],description:row[1],difficulty:row[2],completed:false,achievement:{id:id(),title:row[3]||('Achievement: '+row[0]),unlocked:false},metadata:{source:'mock-ai'}}}
export function templateFor(g,c){let group=TASKS[g.type]||TASKS.general;if(!group[c.index])group=TASKS.general;return group[c.index]||TASKS.general[0];}


// Older generated saves can contain the unlock instructions in the public hint.
export function hiddenHint(badge) {
  const hint = String(badge.description || '').trim();
  const rule = String(badge.condition || '').trim();
  if (!rule) return hint;
  const explicit = /完成|解锁|累计|连续|至少|全部|第[一二三四五六七八九十\d]+|[0-9]|\b(?:complete[d]?|finish(?:ed)?|unlock|at least|tasks?|first|every|three|twice)\b/i;
  if (hint && !hint.includes(rule) && !explicit.test(hint)) return hint;
  return /[\u3400-\u9fff]/.test(hint + badge.title)
    ? '这枚徽章记录着旅途中的一个秘密。'
    : 'A quiet discovery along the way.';
}
