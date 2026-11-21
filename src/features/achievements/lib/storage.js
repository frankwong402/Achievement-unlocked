import { freshState } from './game-model';

// Keep this key unchanged across the migration so existing user progress survives.
export const STORAGE_KEY = 'achievement-unlocked-prototype-v1';

export function loadState() {
  let state;
  try {
    state = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!state || ![1,2].includes(state.version) || !Array.isArray(state.goals) || !state.goals.length) throw Error('Invalid state');
    if (state.version === 1) {
      state.version = 2;
      state.evilMode = true;
    }
    if (typeof state.evilMode !== 'boolean') state.evilMode = true;
    if (!['dashboard','achievements','review','settings'].includes(state.view)) state.view = 'dashboard';
  } catch {
    state = freshState();
  }
  return state;
}

export function saveState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
