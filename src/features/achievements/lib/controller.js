import {XP} from '../data/mock-content.js';
import {esc} from './utils.js';
import { makeHidden, xp, getAllTasks, chapterProgress, realProgress, hiddenList, makeTask, templateFor} from './game-model.js';
import {offer,rewardStep,rewardInfo} from './reward.mjs';
import {requestQuest,isLiveGoal,generatedGoal,mergeChapter,evaluateGoal} from './quest-api.js';
import {loadState, saveState} from './storage.js';
import {createViews} from '../ui/views.js';

export function mountAchievementApp() {
  const s = loadState();
let modal=null,toastTimer=null,onlyCompleted=false,achTab='all';
function persist(){try{saveState(s);}catch(e){notify('本地存储不可用，请检查浏览器设置。',true);}}
function goal(){return s.goals.find(g=>g.id===s.selectedGoalId)||s.goals[0];}
function chapter(){const g=goal();return g.chapters.find(c=>c.id===s.selectedChapterId)||g.chapters[0];}

function shownProgress(value) {
  if (!s.evilMode || !value) return value;
  const r=offer(s,goal(),chapter());
  if (r.stage===5) return Math.round(value*.76);
  return value===100 && r.stage!==7 ? '99.'+'9'.repeat(1+Math.min(r.presses,3)) : value;
}
let pending='', failure=null, retry=null, alive=true;
function feedback() {
  const root=document.querySelector('.modal-feedback')||document.querySelector('#request-feedback');
  if(!root) return;
  root.innerHTML=pending||failure ? '<div class="feedback" role="status">'+esc(pending||failure)+(failure?' <button class="btn small ghost" data-action="retry">Retry ↻</button>':'')+'</div>' : '';
}
async function run(label, operation) {
  if(pending) return;
  pending=label;failure=null;retry=null;render();
  try { await operation(); }
  catch(e){failure=e.message||'请求失败'; retry=()=>run(label,operation);}
  finally{pending='';if(alive) render();}
}
async function loadBatch(g,c,replace=false) {
  if(!isLiveGoal(g)){generateTasks(g,c,replace);return;}
  const data=await requestQuest('chapters/generate',{goal:g.description,chapter:c.title,chapterDescription:c.description,
    language:/[\u3400-\u9fff]/.test(g.description)?'zh':'en',batch:c.batches,existingTasks:c.tasks.map(({title,completed})=>({title,completed}))});
  mergeChapter(c,data,replace);persist();
}
async function checkSecrets(g,c) {
  if(!isLiveGoal(g)){mockEvaluateHidden(g);return;}
  c.evaluationPending=true;persist();
  const previous=xp(g);
  const titles=await evaluateGoal(g,c);
  c.evaluationPending=false;persist();
  if(titles.length)notify('隐藏成就 · '+titles.join(' / ')+' · +'+(xp(g)-previous)+' XP');
}
function setTask(g,c,t) {
  const previous=xp(g);
  t.completed=!t.completed;t.achievement.unlocked=t.completed;
  if(t.completed){
    t.completedAt=Date.now();t.polishedAt=t.completedAt;
    const oldest=getAllTasks(g).filter(other=>other!==t&&other.completed).sort((a,b)=>(a.polishedAt||0)-(b.polishedAt||0))[0];
    if(oldest&&s.evilMode)oldest.polishedAt=t.completedAt;
    if(s.evilMode){const r=offer(s,g,c);if(r.stage===7)Object.assign(r,{stage:0,presses:0,spin:0,boosts:0});}
  }
  if(isLiveGoal(g))c.evaluationPending=true;
  persist();render();
  const delta=xp(g)-previous;
  const level=Math.floor(xp(g)/1000)>Math.floor(previous/1000) ? ' · LEVEL UP' : '';
  notify((t.completed?t.achievement.title:'已撤销 '+t.title)+' · '+(delta>=0?'+':'')+delta+' XP'+level);
  if(isLiveGoal(g))run('判定隐藏成就…',()=>checkSecrets(g,c));
  else {mockEvaluateHidden(g);persist();render();}
}

function mockEvaluateHidden(g){const previously=new Set(hiddenList(g).filter(h=>h.unlocked).map(h=>h.id));const all=getAllTasks(g),completed=all.filter(t=>t.completed).length;hiddenList(g).forEach(h=>{let eligible=false;if(h.mockRule==='goal-completed-3')eligible=completed>=3;else if(h.mockRule==='chapter-completed-3'){const c=g.chapters.find(c=>c.id===h.chapterId);eligible=!!c&&c.tasks.filter(t=>t.completed).length>=3;}h.unlocked=eligible;});const newly=hiddenList(g).filter(h=>h.unlocked&&!previously.has(h.id));if(newly.length)notify('✦ HIDDEN ACHIEVEMENT UNLOCKED：'+newly.map(h=>h.title).join('、')+ '');}

function generateTasks(g,c,regenerate=false){const template=templateFor(g,c);if(regenerate){c.tasks=c.tasks.filter(t=>t.completed);c.batches=0;}const used=new Set(c.tasks.map(t=>t.title));let added=0;let source=template.filter(r=>!used.has(r[0]));const want=regenerate?4:Math.min(c.generated?2:4,source.length);for(const row of source.slice(0,want)){c.tasks.push(makeTask(row));added++;}
 if(c.generated&&!regenerate&&added===0){const generic=['独立练习并记录一次新进展','复盘一个难点，记录改进方法'];for(const t of generic){const title=t+' · '+(c.batches+1);if(!used.has(title)){c.tasks.push(makeTask([title,'延伸挑战：通过自己的方式完成任务。','medium','Bonus Explorer']));added++;}}}
 c.generated=true;c.batches++;if(!c.hidden.length)c.hidden.push({...makeHidden('chapter',c.id),title:c.index===0?'First Secret':'Quiet Persistence'});mockEvaluateHidden(g);persist();return added;}
function switchChapter(chapterId){s.selectedChapterId=chapterId;s.view='dashboard';persist();render();const g=goal(),c=chapter();if(isLiveGoal(g)&&!c.generated)run('准备本章任务…',()=>loadBatch(g,c));}
function switchGoal(goalId){s.selectedGoalId=goalId;s.selectedChapterId=goal().chapters[0].id;s.view='dashboard';persist();render();}
function setView(view){s.view=view;persist();render();}
function notify(message,isWarn=false){const n=document.getElementById('toast-container');if(!n)return;clearTimeout(toastTimer);n.innerHTML='<div class="toast '+(isWarn?'warn':'')+'"><strong>'+(isWarn?'NOTICE':'ACHIEVEMENT UNLOCKED')+'</strong>'+esc(message)+'</div>';toastTimer=setTimeout(()=>n.innerHTML='',3600);}

const {sidebar,header,dashboard,achievementsPage,settingsPage} = createViews({
  s, chapter, shownProgress,
  getOnlyCompleted:()=>onlyCompleted,
  getAchievementTab:()=>achTab
});
function render() {
  const g=goal(),c=chapter();
  const root=document.getElementById('app');
  if(!root||!alive)return;
  root.innerHTML=`<div class="shell">${sidebar(g)}<div class="workspace">${header(g)}<div class="content"><div id="request-feedback"></div>${s.storageReadOnly?'<p role="alert">原有存档无法读取。此会话为只读，原始存档已保留。</p>':''}${c.evaluationPending&&!pending&&!failure?'<button class="btn ghost" data-action="check-secrets">隐藏成就待判定 · Retry</button>':''}${s.view==='achievements'?achievementsPage(g):s.view==='settings'?settingsPage(g):dashboard(g)}</div></div></div><div id="modal-root"></div>`;
  if(!document.getElementById('toast-container')){const n=document.createElement('div');n.id='toast-container';n.setAttribute('role','status');document.body.append(n);}
  if(modal)renderModal();
  feedback();tickEvilClock();
  root.querySelectorAll('button,select').forEach(el=>{if(pending)el.disabled=true;});
}
function openModal(kind,taskId){failure=null;retry=null;modal={kind,taskId};renderModal();}
function closeModal(){modal=null;failure=null;retry=null;document.getElementById('modal-root').innerHTML='';feedback();}
function renderModal(){const root=document.getElementById('modal-root');if(!modal){root.innerHTML='';return;}let body='';const g=goal(),c=chapter();if(modal.kind==='new-goal'){body=`<div class="card-label">CREATE A NEW QUEST</div><h2>What do you want to achieve?</h2><p>写下你的起点和目标，DeepSeek 将为你规划章节。</p><form id="goal-form"><label class="field-label" for="goal-description">GOAL DESCRIPTION</label><textarea id="goal-description" name="description" class="field" placeholder="例如：我想从零开始学 Python，做出一个自己的项目" maxlength="600" minlength="3" required>${esc(modal.draft||'')}</textarea><div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">取消</button><button type="submit" class="btn primary">生成 Quest →</button></div></form>`;}
else if(modal.kind==='edit-task'||modal.kind==='add-task'){const t=c.tasks.find(t=>t.id===modal.taskId),edit=!!t;body=`<div class="card-label">${edit?'EDIT QUEST':'CREATE CUSTOM QUEST'}</div><h2>${edit?'编辑任务':'添加任务'}</h2><p>${edit?'编辑未完成任务时，对应普通成就将同步更新。':'手动添加内容不会触发真实 AI 调用。'}</p><form id="task-form"><label class="field-label" for="task-title">TASK TITLE</label><input class="field" id="task-title" name="title" value="${edit?esc(t.title):''}" required maxlength="120"/><label class="field-label" for="task-desc">DESCRIPTION</label><textarea class="field" id="task-desc" name="description" required maxlength="500">${edit?esc(t.description):''}</textarea><label class="field-label" for="task-difficulty">DIFFICULTY</label><select class="field" id="task-difficulty" name="difficulty"><option value="easy" ${edit&&t.difficulty==='easy'?'selected':''}>Easy · 40 Task XP + 60 Achievement XP</option><option value="medium" ${edit&&t.difficulty==='medium'?'selected':''}>Medium · 80 Task XP + 120 Achievement XP</option><option value="hard" ${edit&&t.difficulty==='hard'?'selected':''}>Hard · 140 Task XP + 200 Achievement XP</option></select><label class="field-label" for="task-achievement">ACHIEVEMENT TITLE</label><input class="field" id="task-achievement" name="achievement" value="${edit?esc(t.achievement.title):''}" maxlength="100" placeholder="例如：First Steps" required/><div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">取消</button><button type="submit" class="btn primary">${edit?'Save Changes':'Add Task'}</button></div></form>`;}
else if(modal.kind==='delete-task'){const t=c.tasks.find(t=>t.id===modal.taskId);body=`<div class="card-label">CONFIRM ACTION</div><h2>删除任务？</h2><p>删除「${esc(t?.title)}」也会删除其对应的普通成就。此操作不能撤销。</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm-delete">删除任务</button></div>`;}
else if(modal.kind==='regenerate'){body=`<div class="card-label">REGENERATE TASKS</div><h2>重新生成本章？</h2><p>保留所有已完成任务及普通成就，只替换未完成的任务。生成成功后才替换。</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn warning" data-action="confirm-regen">重新生成</button></div>`;}
else if(modal.kind==='reward'){
  const r=offer(s,g,c),done=c.tasks.filter(t=>t.completed).length;
  const [name,title,metric,action]=rewardInfo(r,xp(g),done,c.tasks.length);
  const finished=!s.evilMode||r.stage===7;
  body=`<div class="card-label">${finished?'REWARD RECEIPT':'DARK PATTERN · 讽刺演示'}</div><h2>${finished?'徽章已领取':name}</h2><div class="reward-stage ${r.stage===3?'spin':''}"><strong ${s.evilMode&&r.stage===6?'data-evil-clock data-deadline="'+Number(r.deadline)+'"':''}>${finished?xp(g)+' XP':esc(metric)}</strong><p>${finished?esc(c.title):esc(title)}</p></div><p>已记录 ${done} 项任务 · 真实余额 ${xp(g)} XP</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">回到任务</button>${finished?(s.evilMode?'<button class="btn primary" data-action="replay-reward">重玩领奖</button>':''):'<button class="btn warning" data-action="reward-step">'+action+'</button>'}</div>`;
}
root.innerHTML=`<div class="modal-bg" id="modal-overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(modal.kind)}">${body}<div class="modal-feedback"></div></div></div>`;setTimeout(()=>root.querySelector('input,textarea')?.focus(),30);}
function getTask(idValue){return chapter().tasks.find(t=>t.id===idValue)}
function act(element){const action=element.dataset.action,taskId=element.dataset.id,g=goal(),c=chapter();if(pending)return;
if(action==='retry')return retry?.();
if(action==='check-secrets')return run('判定隐藏成就…',()=>checkSecrets(g,c));
if(action==='claim')return openModal('reward');
if(action==='reward-step'){rewardStep(offer(s,g,c),xp(g));persist();render();return;}
if(action==='replay-reward'){Object.assign(offer(s,g,c),{stage:0,presses:0,spin:0,boosts:0});persist();render();return;}
if(action==='view')setView(element.dataset.view);else if(action==='chapter')switchChapter(taskId);else if(action==='goal')switchGoal(taskId);else if(action==='new-goal')openModal('new-goal');else if(action==='close-modal')closeModal();else if(action==='evil'){s.evilMode=!s.evilMode;persist();render();notify(s.evilMode?'Evil UX 已开启：七种讽刺性交互效果上线。':'Evil UX 已关闭：现在显示真实进度。');}else if(action==='generate'||action==='load-more')return run('准备本章任务…',()=>loadBatch(g,c));else if(action==='filter'){onlyCompleted=!onlyCompleted;render();}else if(action==='complete'){const t=getTask(taskId);if(!t)return;setTask(g,c,t);}else if(action==='edit-task'){const t=getTask(taskId);if(!t)return;if(t.completed)return notify('已完成任务必须先撤销，才能编辑。',true);openModal('edit-task',taskId);}else if(action==='delete-task'){const t=getTask(taskId);if(!t)return;if(t.completed)return notify('已完成任务必须先撤销，才能删除。',true);openModal('delete-task',taskId);}else if(action==='add-task')openModal('add-task');else if(action==='confirm-delete'){c.tasks=c.tasks.filter(t=>t.id!==modal.taskId);closeModal();persist();render();notify('任务与对应普通成就已删除。');}else if(action==='regenerate')openModal('regenerate');else if(action==='confirm-regen'){return run('正在更新任务…',async()=>{await loadBatch(g,c,true);closeModal();});}else if(action==='ach-tab'){achTab=element.dataset.tab;render();}}

const handleClick=event=>{const target=event.target.closest('[data-action]');if(target){act(target);return;}if(!pending&&event.target.id==='modal-overlay')closeModal();};
const handleKeydown=event=>{if(pending)return;if(event.key==='Escape'&&modal){closeModal();return;}if((event.key==='Enter'||event.key===' ')&&event.target.matches('[role="button"][data-action]')){event.preventDefault();act(event.target);}};
const handleSubmit=event=>{if(event.target.id==='goal-form'){event.preventDefault();const form=event.target,description=String(new FormData(form).get('description')||'').trim();if(!description)return;if(pending)return;modal.draft=description;
return run('DeepSeek 正在规划章节…',async()=>{
  const data=await requestQuest('goals/generate',{goal:description,language:/[\u3400-\u9fff]/.test(description)?'zh':'en'});
  const g=generatedGoal(description,data);s.goals.unshift(g);s.selectedGoalId=g.id;s.selectedChapterId=g.chapters[0].id;s.view='dashboard';closeModal();persist();notify('Quest 已创建 · '+g.chapters.length+' 个章节');
});}else if(event.target.id==='task-form'){event.preventDefault();const f=new FormData(event.target),title=String(f.get('title')||'').trim(),desc=String(f.get('description')||'').trim(),difficulty=String(f.get('difficulty')||'medium'),achName=String(f.get('achievement')||'').trim();if(!title||!desc||!achName||!XP[difficulty])return;if(modal.kind==='edit-task'){const t=getTask(modal.taskId);if(!t||t.completed){notify('已完成任务不能直接修改。',true);return;}t.title=title;t.description=desc;t.difficulty=difficulty;t.achievement.title=achName;}else{const t=makeTask([title,desc,difficulty,achName]);chapter().tasks.push(t);chapter().generated=true;}closeModal();persist();render();notify('任务与对应 Achievement 已保存。');}};
function tickEvilClock(){for(const el of document.querySelectorAll('[data-patina]')){const age=Date.now()-Number(el.dataset.patina);el.textContent=age>=84000?'◈ 已氧化':age>=42000?'◈ 氧化中':'✦ 闪耀';el.classList.toggle('tarnished',age>=42000);el.title='演示时间每 12 秒过一天，完成任务可擦亮一枚旧徽章。';}const el=document.querySelector('[data-evil-clock]');if(!el)return;const seconds=Math.max(0,Math.ceil((Number(el.dataset.deadline)-Date.now())/1000));el.textContent=seconds?'00:'+String(seconds).padStart(2,'0'):'已过期 · 仍可领取';}
const evilClockTimer=setInterval(tickEvilClock,1000);
const selectGoal=e=>{if(e.target.id==='goal-picker'&&!pending)switchGoal(e.target.value);};
document.addEventListener('change',selectGoal);
document.addEventListener('click',handleClick);
document.addEventListener('keydown',handleKeydown);
document.addEventListener('submit',handleSubmit);
persist();
render();
return () => {
  alive=false;document.removeEventListener('change',selectGoal);document.getElementById('toast-container')?.remove();
  document.removeEventListener('click',handleClick);
  document.removeEventListener('keydown',handleKeydown);
  document.removeEventListener('submit',handleSubmit);
  clearTimeout(toastTimer);
  clearInterval(evilClockTimer);
};
}
