import {originalText,taskCopies} from './task-text.js';
import {label, currentLocale, loadLanguage, switchLanguage} from './locale.js';
import {XP} from '../data/mock-content.js';
import {esc} from './utils.js';
import { makeHidden, xp, getAllTasks, chapterProgress, realProgress, hiddenList, makeTask, templateFor} from './game-model.js';
import {offer,rewardStep,patinaLabel} from './reward.mjs';
import {requestQuest,isLiveGoal,generatedGoal,mergeChapter,evaluateGoal} from './quest-api.js';
import {loadState, saveState} from './storage.js';
import {rewardDialog} from '../ui/reward-view.js';
import {renameQuest,deleteQuest} from './quest-settings.js';
import {createViews,questSettingsDialog} from '../ui/views.js';

export function mountAchievementApp() {
  loadLanguage();
  const s = loadState();
let modal=null,toastTimer=null,onlyCompleted=false,achTab='all';
function persist(next=s){
  try {saveState(s,next); Object.assign(s,next); return true;}
  catch(error){notify(error?.message || label("本地存储不可用。", "Local storage is unavailable."),true);return false;}
}
function goal(){return s.goals.find(g=>g.id===s.selectedGoalId)||s.goals[0];}
function chapter(){const g=goal();return g?.chapters.find(c=>c.id===s.selectedChapterId)||g?.chapters[0];}

function shownProgress(value) {
  if (!s.evilMode || !value) return value;
  const r=offer(s,goal(),chapter());
  if (r.stage===5) return Math.round(value*.76);
  return value===100 && r.stage!==7 ? '99.'+'9'.repeat(1+Math.min(r.presses,3)) : value;
}
let rustPreview=false;
let pending='', failure=null, retry=null, alive=true;
function feedback() {
  const root=document.querySelector('.modal-feedback')||document.querySelector('#request-feedback');
  if(!root) return;
  root.innerHTML=pending||failure ? '<div class="feedback" role="status">'+esc(pending||failure)+(failure?` <button class="btn small ghost" data-action="retry">${label("重试 ↻", "Retry ↻")}</button>`:'')+'</div>' : '';
}
async function run(statusText, operation) {
  if(pending) return;
  pending=statusText;failure=null;retry=null;render();
  try { await operation(); }
  catch(e){failure=e.message||label("请求失败", "Request failed"); retry=()=>run(statusText,operation);}
  finally{pending='';if(alive) render();}
}
async function loadBatch(g,c,replace=false) {
  if(!isLiveGoal(g)){generateTasks(g,c,replace);return;}
  const data=await requestQuest('chapters/generate',{goal:g.description,chapter:c.title,chapterDescription:c.description,
    batch:c.batches,existingTasks:c.tasks.map(({title,completed})=>({title,completed}))});
  mergeChapter(c,data,replace);persist();
}
async function checkSecrets(g,c) {
  if(!isLiveGoal(g)){mockEvaluateHidden(g);return;}
  c.evaluationPending=true;persist();
  const previous=xp(g);
  const titles=await evaluateGoal(g,c);
  c.evaluationPending=false;persist();
  if(!titles.length && xp(g)<previous)notify(label("隐藏徽章已重新锁定 · ", "Hidden badge locked again · ")+(xp(g)-previous)+' XP');
  if(titles.length)notify(label("隐藏成就 · ", "Hidden achievement · ")+titles.join(' / ')+' · +'+(xp(g)-previous)+' XP');
}
function setTask(g,c,t) {
  const previous=xp(g);
  t.completed=!t.completed;t.achievement.unlocked=t.completed;
  if(t.completed){
    offer(s,g,c).normalClaimed=false;
    t.completedAt=Date.now();t.polishedAt=t.completedAt;
    const oldest=getAllTasks(g).filter(other=>other!==t&&other.completed).sort((a,b)=>(a.polishedAt||0)-(b.polishedAt||0))[0];
    if(oldest&&s.evilMode)oldest.polishedAt=t.completedAt;
    if(s.evilMode){const r=offer(s,g,c);if(r.stage===7)Object.assign(r,{stage:0,presses:0,spin:0,boosts:0});}
  }
  if(isLiveGoal(g))c.evaluationPending=true;
  persist();render();
  const delta=xp(g)-previous;
  const level=Math.floor(xp(g)/1000)>Math.floor(previous/1000) ? ` · ${label("升级", "LEVEL UP")}` : '';
  const copy=taskCopies(g,t)?.[currentLocale()] ?? originalText(t);
  notify((t.completed?copy.achievementTitle:label("已撤销 ", "Undone · ")+copy.title)+' · '+(delta>=0?'+':'')+delta+' XP'+level);
  if(isLiveGoal(g))run(label("判定隐藏成就…", "Checking hidden achievements…"),()=>checkSecrets(g,c));
  else {mockEvaluateHidden(g);persist();render();}
}

function mockEvaluateHidden(g){const previously=new Set(hiddenList(g).filter(h=>h.unlocked).map(h=>h.id));const all=getAllTasks(g),completed=all.filter(t=>t.completed).length;hiddenList(g).forEach(h=>{let eligible=false;if(h.mockRule==='goal-completed-3')eligible=completed>=3;else if(h.mockRule==='chapter-completed-3'){const c=g.chapters.find(c=>c.id===h.chapterId);eligible=!!c&&c.tasks.filter(t=>t.completed).length>=3;}h.unlocked=eligible;});const newly=hiddenList(g).filter(h=>h.unlocked&&!previously.has(h.id));if(newly.length)notify(`✦ ${label("隐藏成就解锁：", "HIDDEN ACHIEVEMENT UNLOCKED：")}`+newly.map(h=>h.title).join('、')+ '');}

function generateTasks(g,c,regenerate=false){const template=templateFor(g,c);if(regenerate){c.tasks=c.tasks.filter(t=>t.completed);c.batches=0;}const used=new Set(c.tasks.map(t=>t.title));let added=0;let source=template.filter(r=>!used.has(r[0]));const want=regenerate?4:Math.min(c.generated?2:4,source.length);for(const row of source.slice(0,want)){c.tasks.push(makeTask(row));added++;}
 if(c.generated&&!regenerate&&added===0){const generic=['独立练习并记录一次新进展','复盘一个难点，记录改进方法'];for(const t of generic){const title=t+' · '+(c.batches+1);if(!used.has(title)){c.tasks.push(makeTask([title,'延伸挑战：通过自己的方式完成任务。','medium','Bonus Explorer']));added++;}}}
 c.generated=true;c.batches++;if(!c.hidden.length)c.hidden.push({...makeHidden('chapter',c.id),title:c.index===0?'First Secret':'Quiet Persistence'});mockEvaluateHidden(g);persist();return added;}
function switchChapter(chapterId){s.selectedChapterId=chapterId;s.view='dashboard';persist();render();const g=goal(),c=chapter();if(isLiveGoal(g)&&!c.generated)run(label("准备本章任务…", "Preparing chapter tasks…"),()=>loadBatch(g,c));}
function switchGoal(goalId){s.selectedGoalId=goalId;s.selectedChapterId=goal().chapters[0].id;s.view='dashboard';persist();render();}
function setView(view){rustPreview=false;s.view=view;persist();render();}
function notify(message,isWarn=false){const n=document.getElementById('toast-container');if(!n)return;clearTimeout(toastTimer);n.innerHTML='<div class="toast '+(isWarn?'warn':'')+'"><strong>'+(isWarn?label("注意", "NOTICE"):label("成就解锁", "ACHIEVEMENT UNLOCKED"))+'</strong>'+esc(message)+'</div>';toastTimer=setTimeout(()=>n.innerHTML='',3600);}

const {sidebar,header,dashboard,achievementsPage,settingsPage} = createViews({
  s, chapter, shownProgress,
  getOnlyCompleted:()=>onlyCompleted,
  getRustPreview:()=>rustPreview,
  getAchievementTab:()=>achTab
});
function render() {
  const g=goal(),c=chapter();
  const root=document.getElementById('app');
  if(!root||!alive)return;
  document.documentElement.lang=currentLocale()==='zh'?'zh-CN':'en';
  root.innerHTML=`<div class="shell">${sidebar(g)}<div class="workspace">${header(g)}<div class="content"><div id="request-feedback"></div>${s.storageReadOnly?`<p role="alert">${label("原有存档无法读取。此会话为只读，原始存档已保留。", "Your save could not be read. This session is read-only and the original save is preserved.")}</p>`:''}${c?.evaluationPending&&!pending&&!failure?`<button class="btn ghost" data-action="check-secrets">${label("隐藏成就待判定 · 重试", "Hidden achievements pending · Retry")}</button>`:''}${s.view==='settings'?settingsPage(g):g&&s.view==='achievements'?achievementsPage(g):dashboard(g)}</div></div></div><div id="modal-root"></div>`;
  if(!document.getElementById('toast-container')){const n=document.createElement('div');n.id='toast-container';n.setAttribute('role','status');document.body.append(n);}
  if(modal)renderModal();
  feedback();tickEvilClock();
  root.querySelectorAll('button,select,textarea,input').forEach(el=>{if(pending)el.disabled=true;});
}
function openModal(kind,taskId){failure=null;retry=null;modal={kind,taskId,goalId:goal()?.id};renderModal();}
function closeModal(){document.querySelector('#app .shell')?.removeAttribute('inert');modal=null;failure=null;retry=null;document.getElementById('modal-root').innerHTML='';feedback();}
function renderModal(){const root=document.getElementById('modal-root');if(!modal){root.innerHTML='';return;}document.querySelector('#app .shell')?.setAttribute('inert','');let body='';const g=goal(),c=chapter();if(modal.kind==='new-goal'){body=`<div class="card-label">${label("创建新征途", "CREATE A NEW QUEST")}</div><h2>${label("你想达成什么目标？", "What do you want to achieve?")}</h2><p>${label("写下你的起点和目标，DeepSeek 将为你规划章节。", "Describe your starting point and goal. DeepSeek will plan your chapters.")}</p><form id="goal-form"><label class="field-label" for="goal-description">${label("目标描述", "GOAL DESCRIPTION")}</label><textarea id="goal-description" name="description" class="field" placeholder="${label("例如：我想从零开始学 Python，做出一个自己的项目", "For example, learn Python from scratch and build my first project")}" maxlength="600" minlength="3" required>${esc(modal.draft||'')}</textarea><div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">${label("取消", "Cancel")}</button><button type="submit" class="btn primary">${label("生成 Quest →", "Generate quest →")}</button></div></form>`;}
else if(modal.kind==='quest-settings'||modal.kind==='delete-quest'){body=questSettingsDialog(g,modal.kind==='delete-quest');}
else if(modal.kind==='edit-task'||modal.kind==='add-task'){const t=c.tasks.find(t=>t.id===modal.taskId),edit=!!t;body=`<div class="card-label">${edit?label("编辑任务信息", "EDIT QUEST"):label("创建自定义任务", "CREATE CUSTOM QUEST")}</div><h2>${edit?label("编辑任务", "Edit task"):label("添加任务", "Add Task")}</h2><p>${edit?label("编辑未完成任务时，对应普通成就将同步更新。", "Editing an unfinished task updates its linked achievement."):label("添加自己的任务和对应成就。", "Add your own task and its achievement.")}</p><form id="task-form"><label class="field-label" for="task-title">${label("任务名称", "TASK TITLE")}</label><input class="field" id="task-title" name="title" value="${edit?esc(t.title):''}" required maxlength="120"/><label class="field-label" for="task-desc">${label("任务描述", "DESCRIPTION")}</label><textarea class="field" id="task-desc" name="description" required maxlength="500">${edit?esc(t.description):''}</textarea><label class="field-label" for="task-difficulty">${label("难度", "DIFFICULTY")}</label><select class="field" id="task-difficulty" name="difficulty"><option value="easy" ${edit&&t.difficulty==='easy'?'selected':''}>${label("简单 · ", "Easy · ")}40${label(" 任务 XP", " Task XP")} + 60${label(" 成就 XP", " Achievement XP")}</option><option value="medium" ${edit&&t.difficulty==='medium'?'selected':''}>${label("中等 · ", "Medium · ")}80${label(" 任务 XP", " Task XP")} + 120${label(" 成就 XP", " Achievement XP")}</option><option value="hard" ${edit&&t.difficulty==='hard'?'selected':''}>${label("困难 · ", "Hard · ")}140${label(" 任务 XP", " Task XP")} + 200${label(" 成就 XP", " Achievement XP")}</option></select><label class="field-label" for="task-achievement">${label("成就名称", "ACHIEVEMENT TITLE")}</label><input class="field" id="task-achievement" name="achievement" value="${edit?esc(t.achievement.title):''}" maxlength="100" placeholder="${label("例如：First Steps", "For example, First Steps")}" required/><div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">${label("取消", "Cancel")}</button><button type="submit" class="btn primary">${edit?label("保存修改", "Save Changes"):label("添加任务", "Add Task")}</button></div></form>`;}
else if(modal.kind==='delete-task'){const t=c.tasks.find(t=>t.id===modal.taskId);body=`<div class="card-label">${label("操作确认", "CONFIRM ACTION")}</div><h2>${label("删除任务？", "Delete this task?")}</h2><p>${label("删除「", "Delete “")}${esc(t?.title)}${label("」也会删除其对应的普通成就。此操作不能撤销。", "” and its linked achievement will be permanently removed.")}</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">${label("取消", "Cancel")}</button><button class="btn danger" data-action="confirm-delete">${label("删除任务", "Delete task")}</button></div>`;}
else if(modal.kind==='regenerate'){body=`<div class="card-label">${label("重新生成任务", "REGENERATE TASKS")}</div><h2>${label("重新生成本章？", "Regenerate this chapter?")}</h2><p>${label("保留所有已完成任务及普通成就，只替换未完成的任务。生成成功后才替换。", "Completed tasks and their badges are kept. Unfinished tasks are replaced once generation succeeds.")}</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">${label("取消", "Cancel")}</button><button class="btn warning" data-action="confirm-regen">${label("重新生成", "Regenerate")}</button></div>`;}
else if(modal.kind==='reward'){
  body=rewardDialog(offer(s,g,c),c,xp(g),s.evilMode);
}
root.innerHTML=`<div class="modal-bg" id="modal-overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(modal.kind)}">${body}<div class="modal-feedback"></div></div></div>`;setTimeout(()=>(root.querySelector('input,textarea')||root.querySelector('button'))?.focus(),30);}
function getTask(idValue){return chapter().tasks.find(t=>t.id===idValue)}
function act(element){const action=element.dataset.action,taskId=element.dataset.id,g=goal(),c=chapter();if(pending)return;
if(action==='translate-task'){
  const t=getTask(taskId);
  if(!t || taskCopies(g,t))return;
  return run(label('正在补全任务的中英双语…','Preparing bilingual task text…'),async()=>{
    const locales=await requestQuest('tasks/translate',{task:originalText(t)});
    const nextTask={...t,locales};
    const chapters=g.chapters.map(ch=>ch.id===c.id?{...ch,tasks:ch.tasks.map(task=>task.id===t.id?nextTask:task)}:ch);
    persist({...s,goals:s.goals.map(item=>item.id===g.id?{...item,chapters}:item)});
  });
}
if(action==='language'){
  switchLanguage();render();
  document.querySelector('[data-action="language"]')?.focus();
  return;
}
if(action==='quest-settings'||action==='delete-quest')return openModal(action);
if(action==='confirm-delete-quest' && modal?.kind==='delete-quest')return applyQuestSettings(() => deleteQuest(s, modal.goalId));
if(action==='retry'){if(modal?.kind==='new-goal')return document.getElementById('goal-form').requestSubmit();return retry?.();}
if(action==='check-secrets')return run(label("判定隐藏成就…", "Checking hidden achievements…"),()=>checkSecrets(g,c));
if(action==='claim'){if(!s.evilMode){offer(s,g,c).normalClaimed=true;persist();}return openModal('reward');}
if(action==='audit-answer'){
  if(element.dataset.choice==='threshold'){offer(s,g,c).auditPassed=true;persist();render();}
  else notify(label("任务完成记录已封存。再看看领奖门槛。", "Your completed tasks are recorded. Check the reward threshold again."),true);
  return;
}
if(action==='preview-rust'){rustPreview=!rustPreview;render();return;}
if(action==='reward-step'){rewardStep(offer(s,g,c),xp(g));persist();render();return;}
if(action==='replay-reward'){Object.assign(offer(s,g,c),{stage:0,presses:0,spin:0,boosts:0,auditPassed:false});persist();render();return;}
if(action==='view')setView(element.dataset.view);else if(action==='chapter')switchChapter(taskId);else if(action==='goal')switchGoal(taskId);else if(action==='new-goal')openModal('new-goal');else if(action==='close-modal')closeModal();else if(action==='evil'){s.evilMode=!s.evilMode;persist();render();notify(s.evilMode?label("Evil UX 已开启：七种讽刺性交互效果上线。", "Evil UX is on."):label("Evil UX 已关闭：现在显示真实进度。", "Evil UX is off. Showing actual progress."));}else if(action==='generate'||action==='load-more')return run(label("准备本章任务…", "Preparing chapter tasks…"),()=>loadBatch(g,c));else if(action==='filter'){onlyCompleted=!onlyCompleted;render();}else if(action==='complete'){const t=getTask(taskId);if(!t)return;setTask(g,c,t);}else if(action==='edit-task'){const t=getTask(taskId);if(!t)return;if(t.completed)return notify(label("已完成任务必须先撤销，才能编辑。", "Undo completion before editing this task."),true);openModal('edit-task',taskId);}else if(action==='delete-task'){const t=getTask(taskId);if(!t)return;if(t.completed)return notify(label("已完成任务必须先撤销，才能删除。", "Undo completion before deleting this task."),true);openModal('delete-task',taskId);}else if(action==='add-task')openModal('add-task');else if(action==='confirm-delete'){c.tasks=c.tasks.filter(t=>t.id!==modal.taskId);closeModal();persist();render();notify(label("任务与对应普通成就已删除。", "Task and linked achievement deleted."));}else if(action==='regenerate')openModal('regenerate');else if(action==='confirm-regen'){return run(label("正在更新任务…", "Updating tasks…"),async()=>{await loadBatch(g,c,true);closeModal();});}else if(action==='ach-tab'){achTab=element.dataset.tab;render();}}

const handleClick=event=>{const target=event.target.closest('[data-action]');if(target){act(target);return;}if(!pending&&event.target.id==='modal-overlay')closeModal();};
const handleKeydown=event=>{if(pending)return;if(event.key==='Escape'&&modal){closeModal();return;}if((event.key==='Enter'||event.key===' ')&&event.target.matches('[role="button"][data-action]')){event.preventDefault();act(event.target);}};
function applyQuestSettings(change){
  try {
    const next=change();
    if(!persist(next))return;
    closeModal();onlyCompleted=false;render();
  } catch(error){notify(error.message,true);}
}
const handleSubmit=event=>{
  if(event.target.id==='quest-settings-form'){
    event.preventDefault();
    if(!pending && modal?.kind==='quest-settings')applyQuestSettings(() => renameQuest(s, modal.goalId, String(new FormData(event.target).get('title')??'')));
    return;
  }
  if(event.target.id==='goal-form'){event.preventDefault();const form=event.target,description=String(new FormData(form).get('description')||'').trim();if(!description)return;if(pending)return;modal.draft=description;
return run(label("DeepSeek 正在规划章节…", "DeepSeek is planning your chapters…"),async()=>{
  const data=await requestQuest('goals/generate',{goal:description});
  const g=generatedGoal(description,data);s.goals.unshift(g);s.selectedGoalId=g.id;s.selectedChapterId=g.chapters[0].id;s.view='dashboard';closeModal();persist();notify(label("Quest 已创建 · ", "Quest created · ")+g.chapters.length+label(" 个章节", " chapters"));
});}else if(event.target.id==='task-form'){event.preventDefault();const f=new FormData(event.target),title=String(f.get('title')||'').trim(),desc=String(f.get('description')||'').trim(),difficulty=String(f.get('difficulty')||'medium'),achName=String(f.get('achievement')||'').trim();if(!title||!desc||!achName||!XP[difficulty])return;if(modal.kind==='edit-task'){const t=getTask(modal.taskId);if(!t||t.completed){notify(label("已完成任务不能直接修改。", "Undo completion to edit this task."),true);return;}if(t.title!==title || t.description!==desc || t.achievement.title!==achName)delete t.locales;t.title=title;t.description=desc;t.difficulty=difficulty;t.achievement.title=achName;}else{const t=makeTask([title,desc,difficulty,achName]);chapter().tasks.push(t);chapter().generated=true;}closeModal();persist();render();notify(label("任务与对应 Achievement 已保存。", "Task and achievement saved."));}};
function tickEvilClock(){for(const el of document.querySelectorAll('[data-patina]')){const patina=patinaLabel(Number(el.dataset.patina),Date.now()+(rustPreview?84000:0));el.textContent=patina;el.classList.toggle('tarnished',patina!==label("闪耀", "Polished"));el.title=label("演示时间每 12 秒过一天，完成任务可擦亮一枚旧徽章。", "Every 12 seconds simulates one day. Complete a task to polish an old badge.");}const el=document.querySelector('[data-evil-clock]');if(!el)return;const seconds=Math.max(0,Math.ceil((Number(el.dataset.deadline)-Date.now())/1000));el.textContent=seconds?'00:'+String(seconds).padStart(2,'0'):label("已过期 · 仍可领取", "Expired · Still claimable");}
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
