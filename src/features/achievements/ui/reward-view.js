import {esc} from '../lib/utils.js';
import {rewardInfo, chapterAudit} from '../lib/reward.mjs';

function gauge(amount) {
  return `<div class="claim-gauge" aria-hidden="true"><i style="width:${amount}%"></i></div>`;
}

export function rewardDialog(r, chapter, earned, evil) {
  const done = chapter.tasks.filter(task => task.completed).length;
  const pct = Math.round(100 * done / Math.max(chapter.tasks.length, 1));
  const audit = chapterAudit(chapter);
  const seal = Boolean(audit && evil && !r.auditPassed);
  const finished = !evil || (r.stage === 7 && !seal);
  const [name, detail, metric, action] = rewardInfo(r, earned, done, chapter.tasks.length);
  let title = name, display = esc(metric), description = esc(detail), graphic = '';
  let buttons = `<button class="btn warning" data-action="reward-step">${action}</button>`;
  if (finished) {
    title = '徽章已领取';
    display = '✦';
    description = esc(chapter.title);
    buttons = evil ? '<button class="btn ghost" data-action="replay-reward">重玩领奖</button>' : '';
  } else if (seal) {
    title = '终章复核';
    display = `${audit.total} / ${audit.total}`;
    description = `本章已全部完成，其中 ${audit.hard} 项为高难度。`;
    graphic = gauge(100);
    if (audit.challenge) {
      description += ' 复核员临时追加一项加试：找出这次复核中会变动的数字。';
      buttons = '<button class="btn ghost" data-action="audit-answer" data-choice="done">已完成任务数</button><button class="btn warning" data-action="audit-answer" data-choice="threshold">领奖门槛</button>';
    } else {
      buttons = '<button class="btn primary" data-action="audit-answer" data-choice="threshold">通过复核</button>';
    }
  } else if (r.stage === 0 || r.stage === 5) {
    graphic = gauge(r.stage === 0 ? 99.9 : Math.round(pct * .76));
  } else if (r.stage === 3) {
    buttons = [0,1,2].map((slot) => `<button class="draw-slot" data-action="reward-step" aria-label="抽取碎片 ${slot+1}">◇<small>抽取 ${slot+1}</small></button>`).join('');
    graphic = '<div class="shards" aria-hidden="true">◆ ◆ ◆ ◆ ◇</div>';
  } else if (r.stage === 4) {
    graphic = gauge(r.boosts ? 60 : 67);
  } else if (r.stage === 6) {
    display = `<span data-evil-clock data-deadline="${Number(r.deadline)}">00:25</span>`;
  }

  return `<div class="card-label">${finished?'REWARD RECEIPT':'DARK PATTERN · 讽刺演示'}</div>
    <h2>${esc(title)}</h2><div class="reward-stage ${!seal && r.stage===3?'spin':''}">
    <strong>${display}</strong>${graphic}<p>${description}</p></div>
    <p>已记录 ${done} 项任务 · 真实余额 ${earned} XP</p>
    <div class="modal-actions"><button class="btn ghost" data-action="close-modal">回到任务</button>${buttons}</div>`;
}
