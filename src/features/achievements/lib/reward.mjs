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
    ['Infinite Progress','结算精度升级','99.'+'9'.repeat(1+r.presses)+'%','再次结算'],
    ['Moving Goalposts','领取门槛临时上调',earned+' → '+(earned+120)+' XP','复核门槛'],
    ['Surprise Requirement','领取前，请补领一张「无需补领证明」。','0 / 1 证明','盖上虚构印章'],
    ['Lucky Draw','转动碎片盘，拼出奖励。',r.spin?'4.9 / 5 碎片':'4 / 5 碎片','转动碎片盘'],
    ['Friend Boost','虚构队友已经赶来。',r.boosts?'3 / 5 助力':'2 / 3 助力','模拟队友助力'],
    ['Progress Rollback','复核折算了这枚奖励的进度。',pct+'% → '+Math.round(pct*.76)+'%','申请恢复'],
    ['Fake Urgency','奖励窗口即将关闭。','00:25','收下徽章'],
    ['Reward collected','徽章已归档。',earned+' XP','返回任务']
  ];
  return scenes[r.stage] || scenes[0];
}
