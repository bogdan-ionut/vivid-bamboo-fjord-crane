import { levelCount } from "./levels";

const KEY = "osea-lois-save";
const VERSION = 2;

export interface SaveData {
  version: number;
  unlocked: number;
  completed: boolean[];
  lastLevel: number;
  muted: boolean;
  medals: number[];
  bestMoves: Array<number | null>;
  bestOrbs: number[];
}

type PartialSave = Partial<SaveData> & {
  completed?: boolean[];
  medals?: number[];
  bestMoves?: Array<number | null>;
  bestOrbs?: number[];
};

const defaults = (): SaveData => {
  const n = levelCount();
  return {
    version: VERSION,
    unlocked: 1,
    completed: Array.from({ length: n }, () => false),
    lastLevel: 0,
    muted: false,
    medals: Array.from({ length: n }, () => 0),
    bestMoves: Array.from({ length: n }, () => null),
    bestOrbs: Array.from({ length: n }, () => 0),
  };
};

function migrate(raw: PartialSave): SaveData {
  const d = defaults();
  const n = levelCount();
  return {
    ...d,
    muted: Boolean(raw.muted ?? d.muted),
    version: VERSION,
    completed: Array.from({ length: n }, (_, i) => Boolean(raw.completed?.[i])),
    medals: Array.from({ length: n }, (_, i) => Math.max(0, Math.min(3, raw.medals?.[i] ?? 0))),
    bestMoves: Array.from({ length: n }, (_, i) => {
      const v = raw.bestMoves?.[i];
      return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null;
    }),
    bestOrbs: Array.from({ length: n }, (_, i) => Math.max(0, raw.bestOrbs?.[i] ?? 0)),
    unlocked: Math.max(1, Math.min(n, raw.unlocked ?? 1)),
    lastLevel: Math.max(0, Math.min(n - 1, raw.lastLevel ?? 0)),
  };
}

export function loadSave(): SaveData {
  try {
    const t = localStorage.getItem(KEY);
    if (!t) return defaults();
    return migrate(JSON.parse(t) as PartialSave);
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

export function medalForMoves(moves: number, par: number) {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.4)) return 2;
  return 1;
}

export function completeLevel(
  index: number,
  moves: number,
  orbsCollected: number,
  par: number,
) {
  const s = loadSave();
  const n = levelCount();
  s.completed[index] = true;
  s.unlocked = Math.max(s.unlocked, Math.min(n, index + 2));
  s.lastLevel = Math.min(n - 1, index + 1);
  s.medals[index] = Math.max(s.medals[index] ?? 0, medalForMoves(moves, par));
  const previous = s.bestMoves[index];
  s.bestMoves[index] = previous === null || previous === undefined ? moves : Math.min(previous, moves);
  s.bestOrbs[index] = Math.max(s.bestOrbs[index] ?? 0, orbsCollected);
  writeSave(s);
  return s;
}
