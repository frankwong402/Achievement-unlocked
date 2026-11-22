import { freshState } from './game-model.js';

// Keep this key unchanged across the migration so existing user progress survives.
export const STORAGE_KEY = 'achievement-unlocked-prototype-v1';

export function loadState() {
  let state, raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    state = JSON.parse(raw);
    if (!state || ![1,2].includes(state.version) || !Array.isArray(state.goals) || !state.goals.length) throw Error('Invalid state');
    if (state.version === 1) {
      state.version = 2;
      if (typeof state.evilMode !== 'boolean') state.evilMode = true;
    }
    if (typeof state.evilMode !== 'boolean') state.evilMode = true;
    if (!['dashboard','achievements','settings'].includes(state.view)) state.view = 'dashboard';
  } catch {
    state = freshState();
    state.storageReadOnly = true;
  }
  return state;
}

export function saveState(state) {
  if(state.storageReadOnly) throw Error("Original save is protected");
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
