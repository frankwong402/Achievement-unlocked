import {XP} from '../data/mock-content';
import {esc} from './utils';
import {createGoal, freshState, xp, getAllTasks, chapterProgress, realProgress, hiddenList, makeTask, templateFor} from './game-model';
import {loadState, saveState} from './storage';
import {createViews} from '../ui/views';

// All current AI generation and semantic achievement checks are MOCK implementations.
// Real API routes have intentionally NOT been added yet.
export function mountAchievementApp() {
  const s = loadState();
let modal=null,toastTimer=null,onlyCompleted=false,achTab='all';
function persist(){try{saveState(s);}catch(e){notify('本地存储不可用，请检查浏览器设置。',true);}}
function goal(){return s.goals.find(g=>g.id===s.selectedGoalId)||s.goals[0];}
function chapter(){const g=goal();return g.chapters.find(c=>c.id===s.selectedChapterId)||g.chapters[0];}

function shownProgress(value){return s.evilMode&&value>=99?'99.9':String(value);}

function mockEvaluateHidden(g){const previously=new Set(hiddenList(g).filter(h=>h.unlocked).map(h=>h.id));const all=getAllTasks(g),completed=all.filter(t=>t.completed).length;hiddenList(g).forEach(h=>{let eligible=false;if(h.mockRule==='goal-completed-3')eligible=completed>=3;else if(h.mockRule==='chapter-completed-3'){const c=g.chapters.find(c=>c.id===h.chapterId);eligible=!!c&&c.tasks.filter(t=>t.completed).length>=3;}h.unlocked=eligible;});const newly=hiddenList(g).filter(h=>h.unlocked&&!previously.has(h.id));if(newly.length)notify('✦ HIDDEN ACHIEVEMENT UNLOCKED：'+newly.map(h=>h.title).join('、')+'（Mock AI）');}

function generateTasks(g,c,regenerate=false){const template=templateFor(g,c);if(regenerate){c.tasks=c.tasks.filter(t=>t.completed);c.batches=0;}const used=new Set(c.tasks.map(t=>t.title));let added=0;let source=template.filter(r=>!used.has(r[0]));const want=regenerate?4:Math.min(c.generated?2:4,source.length);for(const row of source.slice(0,want)){c.tasks.push(makeTask(row));added++;}
 if(c.generated&&!regenerate&&added===0){const generic=['独立练习并记录一次新进展','复盘一个难点，记录改进方法'];for(const t of generic){const title=t+' · '+(c.batches+1);if(!used.has(title)){c.tasks.push(makeTask([title,'延伸挑战：通过自己的方式完成任务。','medium','Bonus Explorer']));added++;}}}
 c.generated=true;c.batches++;if(!c.hidden.length)c.hidden.push({...makeHidden('chapter',c.id),title:c.index===0?'First Secret':'Quiet Persistence'});mockEvaluateHidden(g);persist();return added;}
function switchChapter(chapterId){s.selectedChapterId=chapterId;s.view='dashboard';persist();render();}
function switchGoal(goalId){s.selectedGoalId=goalId;s.selectedChapterId=goal().chapters[0].id;s.view='dashboard';persist();render();}
function setView(view){s.view=view;persist();render();}
function notify(message,isWarn=false){const n=document.getElementById('toast-container');if(!n)return;clearTimeout(toastTimer);n.innerHTML='<div class="toast '+(isWarn?'warn':'')+'"><strong>'+(isWarn?'NOTICE':'ACHIEVEMENT UNLOCKED')+'</strong>'+esc(message)+'</div>';toastTimer=setTimeout(()=>n.innerHTML='',3600);}

const {sidebar,header,dashboard,achievementsPage,reviewPage,settingsPage} = createViews({
  s, chapter, shownProgress,
  getOnlyCompleted:()=>onlyCompleted,
  getAchievementTab:()=>achTab
});
function render(){const g=goal();document.getElementById('app').innerHTML=`<div class="shell">${sidebar(g)}<div class="workspace">${header(g)}<div class="content">${s.view==='achievements'?achievementsPage(g):s.view==='review'?reviewPage(g):s.view==='settings'?settingsPage(g):dashboard(g)}<div class="footer">ACHIEVEMENT UNLOCKED · HACKATHON TRACK 2 · INTERACTIVE HTML PROTOTYPE<br>MOCK DATA ONLY. No backend requests, no real AI judgment, no account required.</div></div></div></div><div id="modal-root"></div><div id="toast-container" role="status" aria-live="polite"></div>`;if(modal)renderModal();}
function openModal(kind,taskId){modal={kind,taskId};renderModal();}
function closeModal(){modal=null;document.getElementById('modal-root').innerHTML='';}
function renderModal(){const root=document.getElementById('modal-root');if(!modal){root.innerHTML='';return;}let body='';const g=goal(),c=chapter();if(modal.kind==='new-goal'){body=`<div class="card-label">CREATE A NEW QUEST</div><h2>What do you want to achieve?</h2><p>用自然语言输入目标；本原型根据关键词套用 Mock 章节，不调用真实 AI。</p><form id="goal-form"><label class="field-label" for="goal-description">GOAL DESCRIPTION</label><textarea id="goal-description" name="description" class="field" placeholder="例如：我想从零开始学 Python，做出一个自己的项目" maxlength="600" required></textarea><div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">取消</button><button type="submit" class="btn primary">Create Mock Quest →</button></div></form>`;}
else if(modal.kind==='edit-task'||modal.kind==='add-task'){const t=c.tasks.find(t=>t.id===modal.taskId),edit=!!t;body=`<div class="card-label">${edit?'EDIT QUEST':'CREATE CUSTOM QUEST'}</div><h2>${edit?'编辑任务':'添加任务'}</h2><p>${edit?'编辑未完成任务时，对应普通成就将同步更新。':'手动添加内容不会触发真实 AI 调用。'}</p><form id="task-form"><label class="field-label" for="task-title">TASK TITLE</label><input class="field" id="task-title" name="title" value="${edit?esc(t.title):''}" required maxlength="120"/><label class="field-label" for="task-desc">DESCRIPTION</label><textarea class="field" id="task-desc" name="description" required maxlength="500">${edit?esc(t.description):''}</textarea><label class="field-label" for="task-difficulty">DIFFICULTY</label><select class="field" id="task-difficulty" name="difficulty"><option value="easy" ${edit&&t.difficulty==='easy'?'selected':''}>Easy · 40 Task XP + 60 Achievement XP</option><option value="medium" ${edit&&t.difficulty==='medium'?'selected':''}>Medium · 80 Task XP + 120 Achievement XP</option><option value="hard" ${edit&&t.difficulty==='hard'?'selected':''}>Hard · 140 Task XP + 200 Achievement XP</option></select><label class="field-label" for="task-achievement">ACHIEVEMENT TITLE</label><input class="field" id="task-achievement" name="achievement" value="${edit?esc(t.achievement.title):''}" maxlength="100" placeholder="例如：First Steps" required/><div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">取消</button><button type="submit" class="btn primary">${edit?'Save Changes':'Add Task'}</button></div></form>`;}
else if(modal.kind==='delete-task'){const t=c.tasks.find(t=>t.id===modal.taskId);body=`<div class="card-label">CONFIRM ACTION</div><h2>删除任务？</h2><p>删除「${esc(t?.title)}」也会删除其对应的普通成就。此操作不能撤销。</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm-delete">删除任务</button></div>`;}
else if(modal.kind==='regenerate'){body=`<div class="card-label">REGENERATE TASKS</div><h2>重新生成本章？</h2><p>保留所有已完成任务及普通成就，只替换未完成的任务。已解锁隐藏成就的保留策略在真实系统中仍需进一步审查。</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn warning" data-action="confirm-regen">Mock Regenerate</button></div>`;}
root.innerHTML=`<div class="modal-bg" id="modal-overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(modal.kind)}">${body}</div></div>`;setTimeout(()=>root.querySelector('input,textarea')?.focus(),30);}
function getTask(idValue){return chapter().tasks.find(t=>t.id===idValue)}
function act(element){const action=element.dataset.action,taskId=element.dataset.id,g=goal(),c=chapter();if(action==='view')setView(element.dataset.view);else if(action==='chapter')switchChapter(taskId);else if(action==='goal')switchGoal(taskId);else if(action==='new-goal')openModal('new-goal');else if(action==='close-modal')closeModal();else if(action==='evil'){s.evilMode=!s.evilMode;persist();render();notify(s.evilMode?'Evil UX 已开启：进度可能被故意卡在 99.9%。':'Evil UX 已关闭：现在显示真实进度。');}else if(action==='generate'||action==='load-more'){const n=generateTasks(g,c);render();notify('Mock AI：生成了 '+n+' 个任务。');}else if(action==='filter'){onlyCompleted=!onlyCompleted;render();}else if(action==='complete'){const t=getTask(taskId);if(!t)return;t.completed=!t.completed;t.achievement.unlocked=t.completed;mockEvaluateHidden(g);persist();render();if(t.completed)notify('任务已完成 · '+t.achievement.title+' · +'+(XP[t.difficulty].task+XP[t.difficulty].achievement)+' XP');else notify('任务完成已撤销，相关 XP 与成就已重新计算。',true);}else if(action==='edit-task'){const t=getTask(taskId);if(!t)return;if(t.completed)return notify('已完成任务必须先撤销，才能编辑。',true);openModal('edit-task',taskId);}else if(action==='delete-task'){const t=getTask(taskId);if(!t)return;if(t.completed)return notify('已完成任务必须先撤销，才能删除。',true);openModal('delete-task',taskId);}else if(action==='add-task')openModal('add-task');else if(action==='confirm-delete'){c.tasks=c.tasks.filter(t=>t.id!==modal.taskId);closeModal();mockEvaluateHidden(g);persist();render();notify('任务与对应普通成就已删除。');}else if(action==='regenerate')openModal('regenerate');else if(action==='confirm-regen'){const n=generateTasks(g,c,true);closeModal();render();notify('已保留完成任务，重新生成 '+n+' 个 Mock 任务。');}else if(action==='ach-tab'){achTab=element.dataset.tab;render();}}

const handleClick=event=>{const target=event.target.closest('[data-action]');if(target){act(target);return;}if(event.target.id==='modal-overlay')closeModal();};
const handleKeydown=event=>{if(event.key==='Escape'&&modal){closeModal();return;}if((event.key==='Enter'||event.key===' ')&&event.target.matches('[role="button"][data-action]')){event.preventDefault();act(event.target);}};
const handleSubmit=event=>{if(event.target.id==='goal-form'){event.preventDefault();const form=event.target,description=String(new FormData(form).get('description')||'').trim();if(!description)return;const newGoal=createGoal(description,description.length>38?description.slice(0,38)+'…':description);s.goals.unshift(newGoal);s.selectedGoalId=newGoal.id;s.selectedChapterId=newGoal.chapters[0].id;s.view='dashboard';closeModal();persist();render();notify('新 Goal 已创建：章节大纲为 Mock 生成。');}else if(event.target.id==='task-form'){event.preventDefault();const f=new FormData(event.target),title=String(f.get('title')||'').trim(),desc=String(f.get('description')||'').trim(),difficulty=String(f.get('difficulty')||'medium'),achName=String(f.get('achievement')||'').trim();if(!title||!desc||!achName||!XP[difficulty])return;if(modal.kind==='edit-task'){const t=getTask(modal.taskId);if(!t||t.completed){notify('已完成任务不能直接修改。',true);return;}t.title=title;t.description=desc;t.difficulty=difficulty;t.achievement.title=achName;}else{const t=makeTask([title,desc,difficulty,achName]);chapter().tasks.push(t);chapter().generated=true;}closeModal();persist();render();notify('任务与对应 Achievement 已保存。');}};
document.addEventListener('click',handleClick);
document.addEventListener('keydown',handleKeydown);
document.addEventListener('submit',handleSubmit);
persist();
render();
return () => {
  document.removeEventListener('click',handleClick);
  document.removeEventListener('keydown',handleKeydown);
  document.removeEventListener('submit',handleSubmit);
  clearTimeout(toastTimer);
};
}
