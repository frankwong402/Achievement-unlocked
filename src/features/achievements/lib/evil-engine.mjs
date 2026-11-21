/**
 * Evil UX as a visible satire of manipulative gamification.
 * Only the PRESENTATION and demo stage are affected.
 * Real Task.completed, achievement.unlocked and earned XP are never modified here.
 */
const empty = {attempts:0,deadline:null};
const scenes = [
  {name:"INFINITE PROGRESS",title:"So close. So, so close.",body:"你已经完成了……几乎。系统决定把小数点再向右挪一位。明明快到终点，终点却开始无限后退。",metric:"99.9%",button:"CLAIM MY REWARD →",symbol:"∞"},
  {name:"SURPRISE CONDITIONS",title:"One tiny extra requirement.",body:"恭喜！只差最后一步：请先完成一个刚刚凭空出现的「最终最终挑战」。放心，它不是真正的任务。",metric:"+1 NEW CONDITION",button:"FINE. CONTINUE →",symbol:"+"},
  {name:"MOVING GOALPOSTS",title:"XP requirement updated!",body:"原本需要 100 XP，系统现在宣布你需要 10,000 XP。为什么？因为奖励值得更多努力……大概吧。",metric:"100 → 10,000 XP",button:"ACCEPT THE NEW RULES →",symbol:"↗"},
  {name:"LUCKY DRAW",title:"Only one fragment missing.",body:"你集齐了 4 / 5 块碎片。来抽最后一块吧！系统永远可以告诉你还差一点。这个抽奖只是交互演示，不涉及真实概率或奖励。",metric:"4 / 5 FRAGMENTS",button:"SPIN THE WHEEL ◇",symbol:"◈"},
  {name:"FRIEND BOOST",title:"Invite your whole universe.",body:"「只需邀请 3 位好友」突然变成「邀请 5 位好友」。这里是虚构助力演示，不会分享链接，也不会联系任何人。",metric:"2 / 5 INVITES",button:"SIMULATE A BOOST →",symbol:"♧"},
  {name:"PROGRESS ROLLBACK",title:"Wait... where did it go?",body:"没有删除任何任务，进度条却忽然倒退了 24%。真实完成记录和 XP 没有变化，只是页面在假装你失去了进展。",metric:"−24% DISPLAY ONLY",button:"RECOVER PROGRESS →",symbol:"↙"},
  {name:"FAKE URGENCY",title:"Your reward is expiring.",body:"奖励即将过期！倒计时只是讽刺性演示，不会真正收回成就、清除 XP 或触发任何收费行为。",metric:"00:25",button:"SAVE MY REWARD →",symbol:"◷"}
];
export function evilState(s,g) {
  const raw=s.evilExperiments?.[g.id];
  const attempts=Number.isInteger(raw?.attempts)&&raw.attempts>=0?Math.min(raw.attempts,10000):0;
  const deadline=Number.isFinite(raw?.deadline)?raw.deadline:null;
  return {attempts,deadline};
}
export function evilScene(s,g,now=Date.now()) {
  const state=evilState(s,g);
  const stage=state.attempts%scenes.length;
  const round=Math.floor(state.attempts/scenes.length);
  const scene=scenes[stage];
  const seconds=stage===6?Math.max(0,Math.ceil(((state.deadline??now)-now)/1000)):null;
  return {
    ...scene,stage,round,attempts:state.attempts,
    metric:stage===0 ? "99."+"9".repeat(Math.min(1+round,6))+"%" : stage===6 ? "00:"+String(seconds).padStart(2,"0") : scene.metric,
    deadline:stage===6?state.deadline:null
  };
}
export function advanceEvilScene(s,g,now=Date.now()) {
  s.evilExperiments ??= {};
  const current=evilState(s,g);
  const attempts=current.attempts+1;
  s.evilExperiments[g.id]={
    attempts,
    deadline:attempts%scenes.length===6?now+25000:null
  };
  return evilScene(s,g,now);
}
export function resetEvilScene(s,g) {
  if(s.evilExperiments)delete s.evilExperiments[g.id];
  return evilScene(s,g);
}
export function apparentProgress(s,g,truePercent) {
  if(!s.evilMode)return String(truePercent);
  const stage=evilScene(s,g).stage;
  if(stage===5&&truePercent>0)return String(Math.max(0,Math.round(truePercent*0.76)));
  if(truePercent>=99)return evilScene(s,g).metric.endsWith("%")&&stage===0?evilScene(s,g).metric.slice(0,-1):"99.9";
  return String(truePercent);
}
