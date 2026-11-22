import {label} from './locale.js';

// Reward receipts are cosmetic. They never change completed tasks or earned XP.
// Flow v2: virtual stamp -> recalculate -> verified 100%.
export function offer(state, g, c) {
  state.rewardOffers ??= {};
  const key = g.id + '/' + c.id;
  const receipt = state.rewardOffers[key] ??= {stage:0, flowVersion:2};
  if (receipt.flowVersion !== 2) {
    // Preserve rewards claimed in old saves without keeping the old dark patterns.
    receipt.stage = receipt.stage === 7 ? 2 : 0;
    receipt.flowVersion = 2;
  }
  return receipt;
}

export function rewardStep(receipt) {
  receipt.stage = Math.min(2, Math.max(0, Number(receipt.stage) || 0) + 1);
  receipt.flowVersion = 2;
  return receipt;
}

export function rewardInfo(receipt) {
  const scenes = [
    [
      label('章节结算 · 等待盖章', 'Chapter complete · Awaiting stamp'),
      label('所有任务已完成。为这段旅程盖上一枚虚拟纪念章。', 'All chapter tasks are done. Give this milestone its virtual seal.'),
      label('待盖章', 'NOT STAMPED'),
      label('盖虚拟章', 'Stamp the certificate')
    ],
    [
      label('虚拟章已盖好', 'Virtual stamp applied'),
      label('还差一次仪式性的进度重算。真实任务和 XP 不受影响。', 'One ceremonial recalculation remains. Your actual tasks and XP are unchanged.'),
      '99.9%',
      'Recalculate → 100%'
    ],
    [
      label('本章已完成', 'Chapter completed'),
      label('重新计算完成：本章进度已确认达到 100%。', 'Recalculation complete: chapter progress verified at 100%.'),
      '100%',
      label('查看凭证', 'View receipt')
    ]
  ];
  return scenes[receipt.stage] || scenes[0];
}

// Retained as a read-only helper for existing saves and verification.
export function chapterAudit(chapter) {
  if (!chapter.tasks.length || chapter.tasks.some(task => !task.completed)) return null;
  const hard = chapter.tasks.filter(task => task.difficulty === 'hard').length;
  return {total: chapter.tasks.length, hard, challenge: hard < chapter.tasks.length / 2};
}

export function patinaLabel(polishedAt, now) {
  const age = Math.max(0, now - polishedAt);
  if (age >= 84000) return label('已氧化', 'Tarnished');
  return age >= 42000 ? label('氧化中', 'Tarnishing') : label('闪耀', 'Polished');
}
