import {label} from './locale.js';
import { freshState } from './game-model.js';

// Keep this key unchanged across the migration so existing user progress survives.
export const STORAGE_KEY = 'achievement-unlocked-prototype-v1';

const snapshots = new WeakMap();

export function loadState() {
  let state, raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      state = freshState();
      snapshots.set(state, null);
      return state;
    }
    state = JSON.parse(raw);
    if (!state || ![1,2].includes(state.version) || !Array.isArray(state.goals)) throw Error('Invalid state');
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
  snapshots.set(state, raw);
  return state;
}

export function saveState(state, next = state) {
  if(state.storageReadOnly) throw Error(label("原始存档已受保护。", "Original save is protected"));
  const storage = window.localStorage;
  if (snapshots.has(state) && storage.getItem(STORAGE_KEY) !== snapshots.get(state))
    throw Error(label("另一标签页已更新存档，请刷新后再试。", "Another tab updated your save. Refresh and try again."));
  const raw = JSON.stringify(next);
  storage.setItem(STORAGE_KEY, raw);
  snapshots.set(state, raw);
}
