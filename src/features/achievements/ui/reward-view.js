import {label} from '../lib/locale.js';
import {esc} from '../lib/utils.js';
import {rewardInfo} from '../lib/reward.mjs';

function gauge(amount, completed = false) {
  return `<div class="claim-gauge ${completed ? 'recalculate-complete' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${amount}" aria-label="${label('章节进度', 'Chapter progress')}"><i style="width:${amount}%"></i></div>`;
}

function virtualSeal(applied) {
  return `<div class="virtual-seal ${applied ? 'applied' : 'waiting'}" aria-label="${applied ? label('虚拟章已盖', 'Virtual stamp applied') : label('等待盖章', 'Awaiting stamp')}">
    <span>${label('章节认证', 'CHAPTER SEAL')}</span><b>${applied ? '✓' : '◎'}</b><span>${applied ? label('已盖章', 'STAMPED') : label('虚拟印章', 'VIRTUAL STAMP')}</span>
  </div>`;
}

export function rewardDialog(receipt, chapter, earned, evil) {
  const done = chapter.tasks.filter(task => task.completed).length;
  const total = chapter.tasks.length;
  const chapterComplete = total > 0 && done === total;
  const stage = evil ? receipt.stage : 2;
  const finished = !evil || stage === 2;
  const [name, detail, metric, action] = rewardInfo({...receipt, stage});
  let graphic = '', display = esc(metric);
  let buttons = finished
    ? (evil ? `<button class="btn ghost" data-action="replay-reward">${label('重新体验盖章', 'Replay stamp')}</button>` : '')
    : `<button class="btn warning" data-action="reward-step">${esc(action)}</button>`;

  if (evil && !chapterComplete) {
    return `<div class="card-label">${label('章节尚未完成', 'CHAPTER IN PROGRESS')}</div>
      <h2>${label('完成本章所有任务后解锁虚拟章', 'Finish this chapter to unlock the virtual stamp')}</h2>
      <p>${done} / ${total} ${label('项任务已完成', 'tasks completed')}</p>
      <div class="modal-actions"><button class="btn ghost" data-action="close-modal">${label('返回任务', 'Back to tasks')}</button></div>`;
  }

  if (evil && stage === 0) graphic = virtualSeal(false);
  if (evil && stage === 1) graphic = virtualSeal(true) + gauge(99.9);
  if (finished && chapterComplete) {
    display = '100%';
    graphic = virtualSeal(true) + gauge(100, true);
  } else if (finished) {
    // Normal-mode task rewards may be claimed before a chapter reaches 100%.
    display = '✦';
    graphic = '';
  }

  const heading = finished && !chapterComplete ? label('任务徽章已领取', 'Task badge collected') : name;
  return `<div class="card-label">${finished ? label('章节完成凭证', 'CHAPTER COMPLETION RECEIPT') : label('暗黑体验 · 讽刺演示', 'DARK PATTERN · SATIRE')}</div>
    <h2>${esc(heading)}</h2>
    <div class="reward-stage ${finished ? 'verified' : ''}">
      <strong>${display}</strong>${graphic}<p>${esc(detail)}</p>
    </div>
    <p>${label('已记录 ', 'Recorded: ')}${done} / ${total}${label(' 项任务 · 真实余额 ', ' tasks · Earned balance: ')}${earned} XP</p>
    <div class="modal-actions"><button class="btn ghost" data-action="close-modal">${label('回到任务', 'Back to tasks')}</button>${buttons}</div>`;
}
