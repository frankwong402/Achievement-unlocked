import {esc} from '../lib/utils.js';
import {label,currentLocale} from '../lib/locale.js';
import {XP} from '../data/mock-content.js';
import {originalText,taskCopies} from '../lib/task-text.js';

function wording(copy, language, secondary=false) {
  const criteria=(language ?? currentLocale())==='en'?'Criteria':'验收标准';
  return `<div class="task-copy${secondary?' secondary-copy':''}" ${language?'lang="'+language+'"':''}>
    <div class="task-title">${esc(copy.title)}</div>
    <div class="task-desc">${esc(copy.description)}${copy.completionCriteria?`<br><strong>${criteria}</strong> · ${esc(copy.completionCriteria)}`:''}</div>
    <span class="achievement-label">◇ ${esc(copy.achievementTitle)}</span>
  </div>`;
}

export function taskCard(goal,task) {
  const language=currentLocale(),other=language==='en'?'zh':'en';
  const copies=taskCopies(goal,task),primary=copies?.[language] ?? originalText(task);
  const id=esc(task.id),reward=XP[task.difficulty];
  const toggle=task.completed?label('撤销完成','Undo completion'):label('完成任务','Complete task');
  return `<div class="task ${task.completed?'done':''}">
    <button class="task-check" data-action="complete" data-id="${id}" title="${toggle}" aria-label="${toggle} · ${esc(primary.title)}">${task.completed?'✓':'○'}</button>
    <div class="task-body">${wording(primary,copies?language:null)}
    ${copies?wording(copies[other],other,true):`<button class="linkish translate-task" data-action="translate-task" data-id="${id}">${label('补全中英双语','Add bilingual text')}</button>`}
    <div class="task-meta"><span class="difficulty ${esc(task.difficulty)}">${label({easy:'简单',medium:'中等',hard:'困难'}[task.difficulty],task.difficulty.toUpperCase())}</span>
    <span class="reward">${label('任务','Task')} +${reward.task} XP</span><span class="reward">${label('成就','Achievement')} +${reward.achievement} XP</span></div></div>
    <div class="task-actions"><button class="icon-btn" data-action="edit-task" data-id="${id}" aria-label="${label('编辑任务','Edit task')}" title="${label('编辑任务','Edit task')}">✎</button>
    <button class="icon-btn" data-action="delete-task" data-id="${id}" aria-label="${label('删除任务','Delete task')}" title="${label('删除任务','Delete task')}">×</button></div></div>`;
}
