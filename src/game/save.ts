const KEY = "osea-lois-save";
const VERSION = 1;

export interface SaveData {
  version: number;
  unlocked: number;
  completed: boolean[];
  lastLevel: number;
  muted: boolean;
}

const defaults = (): SaveData => ({
  version: VERSION,
  unlocked: 1,
  completed: Array.from({ length: 10 }, () => false),
  lastLevel: 0,
  muted: false,
});

function migrate(raw: SaveData): SaveData {
  const d = defaults();
  return {
    ...d,
    ...raw,
    version: VERSION,
    completed: Array.from({ length: 10 }, (_, i) => Boolean(raw.completed?.[i])),
    unlocked: Math.max(1, Math.min(10, raw.unlocked ?? 1)),
    lastLevel: Math.max(0, Math.min(9, raw.lastLevel ?? 0)),
  };
}

export function loadSave(): SaveData {
  try {
    const t = localStorage.getItem(KEY);
    if (!t) return defaults();
    return migrate(JSON.parse(t) as SaveData);
  } catch {
    return defaults();
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

export function completeLevel(index: number) {
  const s = loadSave();
  s.completed[index] = true;
  s.unlocked = Math.max(s.unlocked, Math.min(10, index + 2));
  s.lastLevel = Math.min(9, index + 1);
  writeSave(s);
  return s;
}
