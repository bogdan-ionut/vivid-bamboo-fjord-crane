export type Dir = "up" | "down" | "left" | "right";
export type CharId = "osea" | "lois";
export type ObjKind = "box" | "wood" | "ice";
export type Terrain = "floor" | "wall" | "lava" | "water" | "exit";

export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const VEC_DIR: Record<string, Dir> = {
  "0,-1": "up",
  "0,1": "down",
  "-1,0": "left",
  "1,0": "right",
};

export interface Player {
  id: CharId;
  x: number;
  y: number;
  dir: Dir;
}

export interface GridObj {
  kind: ObjKind;
  x: number;
  y: number;
}

export interface Cell {
  terrain: Terrain;
  plate?: number;
  gate?: number;
}

export interface LevelDef {
  id: string;
  title: string;
  hint: string;
  lesson: string;
  map: string[];
  /** Plate channels that also count as exit tiles. */
  plateIsExit?: number[];
}

export interface LevelState {
  w: number;
  h: number;
  cells: Cell[][];
  players: [Player, Player];
  objects: GridObj[];
  active: 0 | 1;
  plateIsExit: number[];
}

export type ActionKind = "move" | "push" | "ability" | "switch" | "undo" | "reset" | "blocked";

export interface SimEvent {
  kind: ActionKind;
  who?: CharId;
  x?: number;
  y?: number;
  extra?: string;
}

export type Screen = "title" | "how" | "select" | "play" | "win" | "pause";
