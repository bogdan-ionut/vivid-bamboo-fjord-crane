import type { GameAssets } from "./assets";
import { pressedChannels } from "./sim";
import type { CharId, Dir, LevelState } from "./types";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: "fire" | "bubble";
}

export interface MoveTween {
  who: CharId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  dur: number;
}

export interface AbilityFx {
  who: CharId;
  t: number;
  dur: number;
  dir: Dir;
}

export interface ViewFx {
  time: number;
  tweens: MoveTween[];
  ability: AbilityFx | null;
  projectiles: Projectile[];
  particles: Particle[];
  shakeX: number;
  shakeY: number;
  winT: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}

function playerDrawPos(s: LevelState, fx: ViewFx, id: CharId) {
  const p = s.players.find((c) => c.id === id)!;
  const tw = fx.tweens.find((t) => t.who === id);
  if (!tw) return { x: p.x, y: p.y, moving: false };
  const k = easeOut(Math.min(1, tw.t / tw.dur));
  return { x: lerp(tw.fromX, tw.toX, k), y: lerp(tw.fromY, tw.toY, k), moving: k < 1 };
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const top = Math.max(4, s * 0.22);
  ctx.fillStyle = "#3a342c";
  ctx.fillRect(x, y + 2, s, s - 2);
  ctx.fillStyle = "#5c5548";
  ctx.fillRect(x + 1, y + top, s - 2, s - top - 1);
  ctx.fillStyle = "#8a836c";
  ctx.fillRect(x + 1, y, s - 2, top + 2);
  ctx.fillStyle = "#b2aa8c";
  ctx.fillRect(x + 2, y + 1, s - 5, 3);
  ctx.fillStyle = "#4a6a3e";
  ctx.fillRect(x + s * 0.2, y + 2, 3, 3);
  ctx.fillRect(x + s * 0.62, y + top + 6, 4, 3);
  ctx.fillStyle = "#2a261f";
  ctx.fillRect(x, y + s - 2, s, 2);
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  cx: number,
  cy: number,
  tile: number,
  opts?: { w?: number; h?: number; alpha?: number },
) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const w = opts?.w ?? tile * 1.18;
  const h = opts?.h ?? tile * 1.38;
  const dx = cx - w / 2;
  const dy = cy - h + tile * 0.12;
  ctx.save();
  ctx.globalAlpha = opts?.alpha ?? 1;
  ctx.drawImage(img, dx, dy, w, h);
  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: LevelState,
  fx: ViewFx,
  activeId: CharId,
) {
  const { width, height } = ctx.canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#0e0d0b";
  ctx.fillRect(0, 0, width, height);

  const pad = 18;
  const tile = Math.max(
    28,
    Math.floor(Math.min((width - pad * 2) / state.w, (height - pad * 2) / state.h)),
  );
  const gw = state.w * tile;
  const gh = state.h * tile;
  const ox = Math.floor((width - gw) / 2) + fx.shakeX;
  const oy = Math.floor((height - gh) / 2) + fx.shakeY;

  const pressed = pressedChannels(state);
  const t = fx.time;

  ctx.save();
  ctx.translate(ox, oy);

  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      const cell = state.cells[y]![x]!;
      const px = x * tile;
      const py = y * tile;
      if (cell.terrain === "wall") continue;
      ctx.drawImage(assets.tiles.floor, px, py, tile, tile);
      if (cell.terrain === "lava") {
        ctx.globalAlpha = 0.92;
        ctx.drawImage(assets.tiles.lava, px, py, tile, tile);
        ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 4 + x);
        ctx.fillStyle = "#c45c3e";
        ctx.fillRect(px, py, tile, tile);
        ctx.globalAlpha = 1;
      }
      if (cell.terrain === "water") {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(assets.tiles.water, px, py, tile, tile);
        ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 3 + y);
        ctx.fillStyle = "#3a7a88";
        ctx.fillRect(px, py, tile, tile);
        ctx.globalAlpha = 1;
      }
      if (cell.terrain === "exit") {
        const pulse = 1 + 0.06 * Math.sin(t * 3);
        const img = assets.props.portal;
        const s = tile * 0.92 * pulse;
        ctx.drawImage(img, px + (tile - s) / 2, py + (tile - s) / 2, s, s);
      }
      if (cell.plate) {
        const on = pressed.has(cell.plate);
        const img = on ? assets.props.plateOn : assets.props.plate;
        ctx.drawImage(img, px + tile * 0.08, py + tile * 0.18, tile * 0.84, tile * 0.7);
      }
    }
  }

  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      const cell = state.cells[y]![x]!;
      if (cell.terrain === "wall") drawWall(ctx, x * tile, y * tile, tile);
      if (cell.gate && !pressed.has(cell.gate)) {
        ctx.drawImage(
          assets.props.gate,
          x * tile + tile * 0.05,
          y * tile - tile * 0.12,
          tile * 0.9,
          tile * 1.12,
        );
      }
    }
  }

  type DrawItem = { y: number; z: number; draw: () => void };
  const items: DrawItem[] = [];

  for (const o of state.objects) {
    items.push({
      y: o.y,
      z: 1,
      draw: () => {
        const img =
          o.kind === "wood" ? assets.props.crate : o.kind === "ice" ? assets.props.ice : assets.props.box;
        ctx.drawImage(img, o.x * tile + tile * 0.06, o.y * tile - tile * 0.08, tile * 0.88, tile * 0.96);
      },
    });
  }

  for (const p of state.players) {
    const pos = playerDrawPos(state, fx, p.id);
    items.push({
      y: pos.y,
      z: 2,
      draw: () => {
        const pack = p.id === "osea" ? assets.osea : assets.lois;
        const ab = fx.ability && fx.ability.who === p.id ? fx.ability : null;
        let img: HTMLImageElement | undefined;
        if (ab) {
          const idx = Math.min(15, Math.floor((ab.t / ab.dur) * 12));
          img = pack.atk[idx];
        } else {
          const frames = pack.walk[p.dir];
          const fi = pos.moving ? Math.floor(t * 8) % 4 : 0;
          img = frames[fi];
        }
        const cx = pos.x * tile + tile / 2;
        const cy = pos.y * tile + tile * 0.92;
        if (p.id === activeId) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(cx, cy - 2, tile * 0.38, tile * 0.14, 0, 0, Math.PI * 2);
          ctx.fillStyle = p.id === "osea" ? "rgba(196,92,62,0.35)" : "rgba(58,122,136,0.4)";
          ctx.fill();
          ctx.restore();
        }
        drawSprite(ctx, img, cx, cy, tile);
      },
    });
  }

  items.sort((a, b) => a.y - b.y || a.z - b.z);
  for (const it of items) it.draw();

  for (const pr of fx.projectiles) {
    const frames = pr.kind === "fire" ? assets.fx.fire : assets.fx.bubble;
    const img = frames[Math.floor(t * 10) % frames.length];
    if (img) {
      const s = tile * 0.7;
      ctx.drawImage(img, pr.x * tile + tile / 2 - s / 2, pr.y * tile + tile / 2 - s / 2, s, s);
    }
  }

  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const px = p.x * tile;
    const py = p.y * tile;
    ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  if (fx.winT > 0) {
    ctx.fillStyle = `rgba(244,236,220,${Math.min(0.18, fx.winT * 0.2)})`;
    ctx.fillRect(-ox, -oy, width, height);
  }

  ctx.restore();
}

export function computeTile(canvas: HTMLCanvasElement, w: number, h: number) {
  const pad = 18;
  return Math.max(28, Math.floor(Math.min((canvas.width - pad * 2) / w, (canvas.height - pad * 2) / h)));
}
