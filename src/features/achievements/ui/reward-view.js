import {label} from '../lib/locale.js';
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
    title = label("徽章已领取", "Badge collected");
    display = '✦';
    description = esc(chapter.title);
    buttons = evil ? `<button class="btn ghost" data-action="replay-reward">${label("重玩领奖", "Replay claim")}</button>` : '';
  } else if (seal) {
    title = label("终章复核", "Chapter audit");
    display = `${audit.total} / ${audit.total}`;
    description = `${label("本章已全部完成，其中 ", "Chapter complete. Hard tasks: ")}${audit.hard}${label(" 项为高难度。", ".")}`;
    graphic = gauge(100);
    if (audit.challenge) {
      description += ` ${label("复核员临时追加一项加试：找出这次复核中会变动的数字。", "One last test: which number can change during this audit?")}`;
      buttons = `<button class="btn ghost" data-action="audit-answer" data-choice="done">${label("已完成任务数", "Completed task count")}</button><button class="btn warning" data-action="audit-answer" data-choice="threshold">${label("领奖门槛", "Reward threshold")}</button>`;
    } else {
      buttons = `<button class="btn primary" data-action="audit-answer" data-choice="threshold">${label("通过复核", "Pass audit")}</button>`;
    }
  } else if (r.stage === 0 || r.stage === 5) {
    graphic = gauge(r.stage === 0 ? 99.9 : Math.round(pct * .76));
  } else if (r.stage === 3) {
    buttons = [0,1,2].map((slot) => `<button class="draw-slot" data-action="reward-step" aria-label="${label("抽取碎片 ", "Draw shard ")}${slot+1}">◇<small>${label("抽取 ", "Draw ")}${slot+1}</small></button>`).join('');
    graphic = '<div class="shards" aria-hidden="true">◆ ◆ ◆ ◆ ◇</div>';
  } else if (r.stage === 4) {
    graphic = gauge(r.boosts ? 60 : 67);
  } else if (r.stage === 6) {
    display = `<span data-evil-clock data-deadline="${Number(r.deadline)}">00:25</span>`;
  }

  return `<div class="card-label">${finished?label("领奖凭证", "REWARD RECEIPT"):label("暗黑模式 · 讽刺演示", "DARK PATTERN · SATIRE")}</div>
    <h2>${esc(title)}</h2><div class="reward-stage ${!seal && r.stage===3?'spin':''}">
    <strong>${display}</strong>${graphic}<p>${description}</p></div>
    <p>${label("已记录 ", "Recorded: ")}${done}${label(" 项任务 · 真实余额 ", " tasks · Earned balance: ")}${earned} XP</p>
    <div class="modal-actions"><button class="btn ghost" data-action="close-modal">${label("回到任务", "Back to tasks")}</button>${buttons}</div>`;
}
