import { loadAssets, type GameAssets } from "./assets";
import { createAudio } from "./audio";
import { createInput, type GameInput } from "./input";
import { LEVELS } from "./levels";
import {
  cloneState,
  isWon,
  parseLevel,
  switchActive,
  tryAbility,
  tryMove,
} from "./sim";
import { completeLevel, loadSave, writeSave, type SaveData } from "./save";
import { renderFrame, type AbilityFx, type MoveTween, type Particle, type Projectile, type ViewFx } from "./render";
import type { CharId, LevelState, Screen, SimEvent } from "./types";
import { DIR_VEC } from "./types";

export interface UiSnapshot {
  screen: Screen;
  levelIndex: number;
  title: string;
  hint: string;
  lesson: string;
  active: CharId;
  moves: number;
  muted: boolean;
  save: SaveData;
  won: boolean;
  ready: boolean;
  loadError: string | null;
}

export interface Engine {
  destroy: () => void;
  unlock: () => void;
  setScreen: (s: Screen) => void;
  playLevel: (i: number) => void;
  nextLevel: () => void;
  tap: (code: string) => void;
  toggleMute: () => void;
  getUi: () => UiSnapshot;
}

const STEP = 1 / 60;
const MOVE_DUR = 0.12;
const ABILITY_DUR = 0.42;

export async function bootEngine(
  canvas: HTMLCanvasElement,
  onUi: (ui: UiSnapshot) => void,
): Promise<Engine> {
  const audio = createAudio();
  const input: GameInput = createInput();
  let assets: GameAssets | null = null;
  let screen: Screen = "title";
  let levelIndex = loadSave().lastLevel;
  let state: LevelState = parseLevel(LEVELS[0]!);
  let undo: LevelState[] = [];
  let moves = 0;
  let save = loadSave();
  let muted = save.muted;
  audio.setMuted(muted);
  let won = false;
  let ready = false;
  let loadError: string | null = null;
  let raf = 0;
  let acc = 0;
  let last = performance.now();
  let running = true;
  let lock = 0;
  let trauma = 0;
  let winT = 0;
  let time = 0;

  const tweens: MoveTween[] = [];
  let ability: AbilityFx | null = null;
  const projectiles: Projectile[] = [];
  const particles: Particle[] = [];

  function emitUi() {
    const def = LEVELS[levelIndex]!;
    onUi({
      screen,
      levelIndex,
      title: def.title,
      hint: def.hint,
      lesson: def.lesson,
      active: state.players[state.active]!.id,
      moves,
      muted,
      save,
      won,
      ready,
      loadError,
    });
  }

  function snapshot() {
    undo.push(cloneState(state));
    if (undo.length > 80) undo.shift();
  }

  function burst(tx: number, ty: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 2.4;
      particles.push({
        x: tx + 0.5,
        y: ty + 0.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.8,
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function handleEvent(ev: SimEvent | null) {
    if (!ev) return;
    if (ev.kind === "blocked") {
      audio.blocked();
      trauma = Math.min(1, trauma + 0.12);
      return;
    }
    if (ev.kind === "move" || ev.kind === "push") {
      audio.move();
      if (ev.kind === "push") audio.push();
      moves += 1;
    }
    if (ev.kind === "ability") {
      if (ev.extra === "burn") {
        audio.burn();
        trauma = Math.min(1, trauma + 0.35);
        if (ev.x !== undefined && ev.y !== undefined) burst(ev.x, ev.y, "#e07a3a", 16);
      } else if (ev.extra === "pop") {
        audio.pop();
        trauma = Math.min(1, trauma + 0.28);
        if (ev.x !== undefined && ev.y !== undefined) burst(ev.x, ev.y, "#7ec8d6", 16);
      } else {
        audio.blocked();
      }
    }
    if (ev.kind === "switch") audio.switchChar();
  }

  function beginTween(who: CharId, fromX: number, fromY: number, toX: number, toY: number) {
    tweens.push({ who, fromX, fromY, toX, toY, t: 0, dur: MOVE_DUR });
    lock = Math.max(lock, MOVE_DUR);
  }

  function playLevel(i: number) {
    const idx = Math.max(0, Math.min(LEVELS.length - 1, i));
    levelIndex = idx;
    state = parseLevel(LEVELS[idx]!);
    undo = [];
    moves = 0;
    won = false;
    winT = 0;
    tweens.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    ability = null;
    lock = 0;
    screen = "play";
    save.lastLevel = idx;
    writeSave(save);
    emitUi();
  }

  function checkWin() {
    if (won) return;
    if (isWon(state)) {
      won = true;
      winT = 0.01;
      audio.win();
      save = completeLevel(levelIndex);
      screen = "win";
      emitUi();
    }
  }

  function applyMove(dx: number, dy: number) {
    if (lock > 0 || won || screen !== "play") return;
    const p = state.players[state.active]!;
    const fromX = p.x;
    const fromY = p.y;
    snapshot();
    const ev = tryMove(state, dx, dy);
    handleEvent(ev);
    if (!ev || ev.kind === "blocked") {
      undo.pop();
      return;
    }
    beginTween(p.id, fromX, fromY, p.x, p.y);
    if (ev.kind === "push" && ev.x !== undefined && ev.y !== undefined) {
      burst(ev.x, ev.y, "#d9c9a8", 6);
    }
    checkWin();
    emitUi();
  }

  function applyAbility() {
    if (lock > 0 || won || screen !== "play") return;
    const p = state.players[state.active]!;
    snapshot();
    const ev = tryAbility(state);
    handleEvent(ev);
    if (!ev || ev.extra === "whiff") {
      if (ev?.extra === "whiff") undo.pop();
    }
    ability = { who: p.id, t: 0, dur: ABILITY_DUR, dir: p.dir };
    lock = ABILITY_DUR;
    const v = DIR_VEC[p.dir];
    projectiles.push({
      x: p.x + v.x * 0.6,
      y: p.y + v.y * 0.6,
      vx: v.x * 6,
      vy: v.y * 6,
      life: 0.28,
      kind: p.id === "osea" ? "fire" : "bubble",
    });
    emitUi();
  }

  function applySwitch() {
    if (lock > 0 || won || screen !== "play") return;
    handleEvent(switchActive(state));
    emitUi();
  }

  function applyUndo() {
    if (screen !== "play" || won) return;
    const prev = undo.pop();
    if (!prev) {
      audio.blocked();
      return;
    }
    state = prev;
    tweens.length = 0;
    lock = 0;
    moves = Math.max(0, moves - 1);
    emitUi();
  }

  function resize() {
    const parent = canvas.parentElement;
    const r = parent?.getBoundingClientRect();
    const w = Math.max(320, Math.floor(r?.width ?? 800));
    const h = Math.max(240, Math.floor(r?.height ?? 600));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  let das = 0;

  function update(dt: number) {
    time += dt;
    if (lock > 0) lock = Math.max(0, lock - dt);
    trauma = Math.max(0, trauma - dt * 2.2);
    if (won) winT += dt;

    for (const tw of tweens) tw.t += dt;
    for (let i = tweens.length - 1; i >= 0; i--) {
      if (tweens[i]!.t >= tweens[i]!.dur) tweens.splice(i, 1);
    }
    if (ability) {
      ability.t += dt;
      if (ability.t >= ability.dur) ability = null;
    }
    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i]!.life <= 0) projectiles.splice(i, 1);
    }
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 3.2 * dt;
      p.life -= dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i]!.life <= 0) particles.splice(i, 1);
    }

    const { held, just } = input.poll();
    if (screen !== "play") return;
    if (just.pause) {
      screen = "pause";
      emitUi();
      return;
    }
    if (just.reset) {
      playLevel(levelIndex);
      return;
    }
    if (just.undo) applyUndo();
    if (just.switchChar) applySwitch();
    if (just.ability) applyAbility();

    if (just.moveX !== 0 || just.moveY !== 0) {
      const dx = Math.sign(just.moveX);
      const dy = dx === 0 ? Math.sign(just.moveY) : 0;
      if (dx || dy) applyMove(dx, dy);
      das = 0.2;
    } else if (held.moveX !== 0 || held.moveY !== 0) {
      das -= dt;
      if (das <= 0 && lock <= 0) {
        const dx = Math.sign(held.moveX);
        const dy = dx === 0 ? Math.sign(held.moveY) : 0;
        if (dx || dy) applyMove(dx, dy);
        das = 0.1;
      }
    } else {
      das = 0;
    }
  }

  function draw() {
    if (!assets) return;
    const shake = trauma * trauma;
    const fx: ViewFx = {
      time,
      tweens,
      ability,
      projectiles,
      particles,
      shakeX: (Math.random() * 2 - 1) * shake * 8,
      shakeY: (Math.random() * 2 - 1) * shake * 8,
      winT,
    };
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderFrame(ctx, assets, state, fx, state.players[state.active]!.id);
  }

  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", resize);

  try {
    assets = await loadAssets();
    ready = true;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nu am putut încărca sprite-urile";
  }
  emitUi();
  last = performance.now();
  raf = requestAnimationFrame(loop);

  const probe = {
    getYaw: () => {
      const p = state.players[state.active]!;
      return p.x;
    },
    getSpeed: () => (tweens.length ? 1 : 0),
    getX: () => state.players[state.active]!.x,
    getY: () => state.players[state.active]!.y,
    setKeys: (codes: string[]) => input.setKeys(codes),
    setSteer: (v: number) => {
      if (v > 0.2) applyMove(-1, 0);
      if (v < -0.2) applyMove(1, 0);
    },
  };
  (window as unknown as { __controlsTest: typeof probe }).__controlsTest = probe;

  return {
    destroy() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      input.destroy();
      window.removeEventListener("resize", resize);
    },
    unlock() {
      audio.unlock();
    },
    setScreen(s) {
      screen = s;
      emitUi();
    },
    playLevel,
    nextLevel() {
      playLevel(Math.min(LEVELS.length - 1, levelIndex + 1));
    },
    tap(code) {
      audio.unlock();
      input.tapAction(code);
    },
    toggleMute() {
      muted = !muted;
      audio.setMuted(muted);
      save.muted = muted;
      writeSave(save);
      emitUi();
    },
    getUi: () => ({
      screen,
      levelIndex,
      title: LEVELS[levelIndex]!.title,
      hint: LEVELS[levelIndex]!.hint,
      lesson: LEVELS[levelIndex]!.lesson,
      active: state.players[state.active]!.id,
      moves,
      muted,
      save,
      won,
      ready,
      loadError,
    }),
  };
}

export { LEVELS };
