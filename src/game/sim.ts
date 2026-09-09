import type {
  Cell,
  CharId,
  Dir,
  GridObj,
  LevelDef,
  LevelState,
  Player,
  SimEvent,
} from "./types";
import { DIR_VEC, VEC_DIR } from "./types";

function inBounds(s: LevelState, x: number, y: number) {
  return x >= 0 && y >= 0 && x < s.w && y < s.h;
}

export function cloneState(s: LevelState): LevelState {
  return {
    w: s.w,
    h: s.h,
    cells: s.cells,
    players: [{ ...s.players[0] }, { ...s.players[1] }],
    objects: s.objects.map((o) => ({ ...o })),
    active: s.active,
    plateIsExit: s.plateIsExit,
    theme: s.theme,
    requireOrbs: s.requireOrbs,
    keys: s.keys.map((p) => ({ ...p })),
    orbs: s.orbs.map((p) => ({ ...p })),
    orbsTotal: s.orbsTotal,
    hasKey: s.hasKey,
  };
}

export function parseLevel(def: LevelDef): LevelState {
  const map = def.map;
  const h = map.length;
  const w = map[0]?.length ?? 0;
  if (map.some((row) => row.length !== w)) {
    throw new Error(`Level ${def.id} has ragged rows`);
  }

  const cells: Cell[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ terrain: "floor" as const })),
  );
  const objects: GridObj[] = [];
  const keys: { x: number; y: number }[] = [];
  const orbs: { x: number; y: number }[] = [];
  let osea: Player | null = null;
  let lois: Player | null = null;

  for (let y = 0; y < h; y++) {
    const row = map[y]!;
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      const cell = cells[y]![x]!;
      if (ch === "#") cell.terrain = "wall";
      else if (ch === "F") cell.terrain = "lava";
      else if (ch === "~") cell.terrain = "water";
      else if (ch === "E") cell.terrain = "exit";
      else if (ch === "d") cell.door = true;
      else if (ch === "k") keys.push({ x, y });
      else if (ch === "*") orbs.push({ x, y });
      else if (ch >= "1" && ch <= "9") {
        cell.plate = ch.charCodeAt(0) - 48;
        if (def.plateIsExit?.includes(cell.plate)) cell.terrain = "exit";
      } else if (ch >= "A" && ch <= "I") {
        cell.gate = ch.charCodeAt(0) - 64;
      } else if (ch === "$") {
        objects.push({ kind: "box", x, y });
      } else if (ch === "W") {
        objects.push({ kind: "wood", x, y });
      } else if (ch === "i") {
        objects.push({ kind: "ice", x, y });
      } else if (ch === "@") {
        osea = { id: "osea", x, y, dir: "right" };
      } else if (ch === "&") {
        lois = { id: "lois", x, y, dir: "right" };
      }
    }
  }

  if (!osea || !lois) throw new Error(`Level ${def.id} missing characters`);

  return {
    w,
    h,
    cells,
    players: [osea, lois],
    objects,
    active: 0,
    plateIsExit: def.plateIsExit ?? [],
    theme: def.theme,
    requireOrbs: Boolean(def.requireOrbs),
    keys,
    orbs,
    orbsTotal: orbs.length,
    hasKey: false,
  };
}

export function pressedChannels(s: LevelState): Set<number> {
  const set = new Set<number>();
  const occupy = (x: number, y: number) => {
    const plate = s.cells[y]?.[x]?.plate;
    if (plate) set.add(plate);
  };
  occupy(s.players[0].x, s.players[0].y);
  occupy(s.players[1].x, s.players[1].y);
  for (const o of s.objects) occupy(o.x, o.y);
  return set;
}

export function isGateOpen(s: LevelState, channel: number) {
  return pressedChannels(s).has(channel);
}

function objectAt(s: LevelState, x: number, y: number) {
  return s.objects.find((o) => o.x === x && o.y === y);
}

function playerAt(s: LevelState, x: number, y: number, ignore?: CharId) {
  return s.players.find((p) => p.x === x && p.y === y && p.id !== ignore);
}

function isSolidWall(s: LevelState, x: number, y: number) {
  const c = s.cells[y]?.[x];
  if (!c) return true;
  if (c.terrain === "wall") return true;
  if (c.door && !s.hasKey) return true;
  if (c.gate && !isGateOpen(s, c.gate)) return true;
  return false;
}

function hazardOk(s: LevelState, x: number, y: number, who: CharId) {
  const t = s.cells[y]?.[x]?.terrain;
  const bridged = Boolean(objectAt(s, x, y));
  if (t === "lava") return who === "osea" || bridged;
  if (t === "water") return who === "lois" || bridged;
  return true;
}

function boxCanEnter(s: LevelState, x: number, y: number) {
  if (!inBounds(s, x, y)) return false;
  if (isSolidWall(s, x, y)) return false;
  if (objectAt(s, x, y)) return false;
  if (playerAt(s, x, y)) return false;
  return true;
}

function collectAt(s: LevelState, x: number, y: number): "key" | "orb" | undefined {
  const ki = s.keys.findIndex((p) => p.x === x && p.y === y);
  if (ki >= 0) {
    s.keys.splice(ki, 1);
    s.hasKey = true;
    return "key";
  }
  const oi = s.orbs.findIndex((p) => p.x === x && p.y === y);
  if (oi >= 0) {
    s.orbs.splice(oi, 1);
    return "orb";
  }
  return undefined;
}

export function tryMove(s: LevelState, dx: number, dy: number): SimEvent | null {
  const p = s.players[s.active]!;
  const dir = VEC_DIR[`${dx},${dy}`];
  if (dir) p.dir = dir;

  const nx = p.x + dx;
  const ny = p.y + dy;
  if (!inBounds(s, nx, ny) || isSolidWall(s, nx, ny)) {
    return { kind: "blocked", who: p.id };
  }
  if (playerAt(s, nx, ny, p.id)) {
    return { kind: "blocked", who: p.id };
  }

  const obj = objectAt(s, nx, ny);
  if (obj) {
    const terrain = s.cells[ny]?.[nx]?.terrain;
    const isBridge = terrain === "lava" || terrain === "water";
    if (isBridge) {
      p.x = nx;
      p.y = ny;
      const pickup = collectAt(s, nx, ny);
      return { kind: "move", who: p.id, x: nx, y: ny, extra: pickup ?? "bridge" };
    }
    const bx = nx + dx;
    const by = ny + dy;
    if (!boxCanEnter(s, bx, by)) return { kind: "blocked", who: p.id };
    obj.x = bx;
    obj.y = by;
    p.x = nx;
    p.y = ny;
    const pickup = collectAt(s, nx, ny);
    return { kind: "push", who: p.id, x: nx, y: ny, extra: pickup ?? obj.kind };
  }

  if (!hazardOk(s, nx, ny, p.id)) return { kind: "blocked", who: p.id };

  p.x = nx;
  p.y = ny;
  const pickup = collectAt(s, nx, ny);
  return { kind: "move", who: p.id, x: nx, y: ny, extra: pickup };
}

export function tryAbility(s: LevelState): SimEvent | null {
  const p = s.players[s.active]!;
  const v = DIR_VEC[p.dir];
  for (let i = 1; i <= 2; i++) {
    const x = p.x + v.x * i;
    const y = p.y + v.y * i;
    if (!inBounds(s, x, y) || isSolidWall(s, x, y)) break;
    const obj = objectAt(s, x, y);
    if (!obj) continue;
    if (p.id === "osea" && obj.kind === "wood") {
      s.objects = s.objects.filter((o) => o !== obj);
      return { kind: "ability", who: "osea", x, y, extra: "burn" };
    }
    if (p.id === "lois" && obj.kind === "ice") {
      s.objects = s.objects.filter((o) => o !== obj);
      return { kind: "ability", who: "lois", x, y, extra: "pop" };
    }
    break;
  }
  return { kind: "ability", who: p.id, extra: "whiff" };
}

export function switchActive(s: LevelState): SimEvent {
  s.active = s.active === 0 ? 1 : 0;
  return { kind: "switch", who: s.players[s.active]!.id };
}

export function isWon(s: LevelState) {
  const portals = s.players.every((p) => s.cells[p.y]?.[p.x]?.terrain === "exit");
  const shardsReady = !s.requireOrbs || s.orbs.length === 0;
  return portals && shardsReady;
}

export function dirFromKeys(dx: number, dy: number): Dir | null {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}
