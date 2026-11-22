import {label} from './locale.js';
// Cosmetic reward receipts are independent of the task and XP ledger.
export function offer(state, g, c) {
  state.rewardOffers ??= {};
  const key = g.id + '/' + c.id;
  return state.rewardOffers[key] ??= {stage:0, presses:0, spin:0, boosts:0, claims:0};
}
export function rewardStep(r, earned, now=Date.now()) {
  switch(r.stage) {
    case 0: if(++r.presses >= 3) r.stage=1; break;
    case 1: r.threshold = earned + 120; r.stage=2; break;
    case 2: r.stage=3; break;
    case 3: if(++r.spin >= 2) r.stage=4; break;
    case 4: if(++r.boosts >= 2) r.stage=5; break;
    case 5: r.deadline=now+25000; r.stage=6; break;
    case 6: r.claims++; r.stage=7; break;
  }
}
export function rewardInfo(r, earned, done, total) {
  const pct = Math.round(100*done/Math.max(1,total));
  const scenes = [
    [label("无限进度", "Infinite Progress"),label("结算精度升级", "Recalculating with extra precision"),'99.'+'9'.repeat(1+r.presses)+'%',label("再次结算", "Recalculate")],
    [label("移动门槛", "Moving Goalposts"),label("领取门槛临时上调", "The reward threshold just went up."),earned+' → '+(earned+120)+' XP',label("复核门槛", "Review threshold")],
    [label("突发条件", "Surprise Requirement"),label("领取前，请补领一张「无需补领证明」。", "Before claiming, certify that no certificate is required."),label("0 / 1 证明", "0 / 1 certificates"),label("盖上虚构印章", "Stamp the certificate")],
    [label("幸运抽奖", "Lucky Draw"),label("转动碎片盘，拼出奖励。", "Draw the last shard to assemble your reward."),r.spin?`4.9 / 5${label(" 碎片", " shards")}`:`4 / 5${label(" 碎片", " shards")}`,label("转动碎片盘", "Draw a shard")],
    [label("好友助力", "Friend Boost"),label("虚构队友已经赶来。", "Your imaginary teammates are here."),r.boosts?`3 / 5${label(" 助力", " boosts")}`:`2 / 3${label(" 助力", " boosts")}`,label("模拟队友助力", "Simulate a boost")],
    [label("进度回退", "Progress Rollback"),label("复核折算了这枚奖励的进度。", "The audit has reduced this reward’s displayed progress."),pct+'% → '+Math.round(pct*.76)+'%',label("申请恢复", "Restore progress")],
    [label("虚假倒计时", "Fake Urgency"),label("奖励窗口即将关闭。", "Your reward window is closing."),'00:25',label("收下徽章", "Collect badge")],
    [label("奖励已领取", "Reward collected"),label("徽章已归档。", "Your badge has been filed."),earned+' XP',label("返回任务", "Return to tasks")]
  ];
  return scenes[r.stage] || scenes[0];
}

// The audit reads the finished chapter and stores its verdict only on the receipt.
export function chapterAudit(chapter) {
  if (!chapter.tasks.length || chapter.tasks.some(task => !task.completed)) return null;
  const hard = chapter.tasks.filter(task => task.difficulty === 'hard').length;
  return {total: chapter.tasks.length, hard, challenge: hard < chapter.tasks.length / 2};
}

export function patinaLabel(polishedAt, now) {
  const age = Math.max(0, now - polishedAt);
  if (age >= 84000) return label("已氧化", "Tarnished");
  return age >= 42000 ? label("氧化中", "Tarnishing") : label("闪耀", "Polished");
}
