import {label} from './locale.js';
function questIndex(state, questId) {
  const index = state.goals.findIndex(goal => goal.id === questId);
  if (index < 0) throw new Error(label("此 Quest 已不存在。", "This quest no longer exists."));
  return index;
}

export function renameQuest(state, questId, title) {
  const index = questIndex(state, questId);
  const name = title.trim();
  if (!name || name.length > 120) throw new Error(label("请输入 1 至 120 个字符的名称。", "Enter a name between 1 and 120 characters."));
  const goals = state.goals.slice();
  goals[index] = {...goals[index], title:name};
  return {...state, goals};
}

export function deleteQuest(state, questId) {
  const index = questIndex(state, questId);
  const goals = state.goals.slice();
  goals.splice(index, 1);
  const next = {...state, goals};
  if (state.selectedGoalId === questId || !goals.some(goal => goal.id === state.selectedGoalId)) {
    const selected = goals[Math.min(index, goals.length - 1)];
    next.selectedGoalId = selected?.id ?? null;
    next.selectedChapterId = selected?.chapters[0]?.id ?? null;
    next.view = 'dashboard';
  }
  if (state.rewardOffers) {
    next.rewardOffers = Object.fromEntries(Object.entries(state.rewardOffers)
      .filter(([key]) => !key.startsWith(questId + '/')));
  }
  return next;
}
