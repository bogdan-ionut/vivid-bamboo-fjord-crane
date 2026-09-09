import type { GameAssets } from "./assets";
import { pressedChannels } from "./sim";
import type { CharId, Dir, LevelState, Theme } from "./types";

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
  levelT: number;
  tweens: MoveTween[];
  ability: AbilityFx | null;
  projectiles: Projectile[];
  particles: Particle[];
  shakeX: number;
  shakeY: number;
  winT: number;
}

type Palette = {
  bg0: string;
  bg1: string;
  haze: string;
  floor: string;
  floor2: string;
  grout: string;
  wall: string;
  wallTop: string;
  wallEdge: string;
  accent: string;
  accent2: string;
};

const PALETTES: Record<Theme, Palette> = {
  meadow: {
    bg0: "#08110d",
    bg1: "#17251a",
    haze: "#5f875c",
    floor: "#776f45",
    floor2: "#8a8050",
    grout: "#4d492f",
    wall: "#41463a",
    wallTop: "#70765d",
    wallEdge: "#262c24",
    accent: "#a6d37a",
    accent2: "#e7d27a",
  },
  ruins: {
    bg0: "#0d0d11",
    bg1: "#27231f",
    haze: "#8f765f",
    floor: "#6c6258",
    floor2: "#7a6f63",
    grout: "#443e38",
    wall: "#403d3a",
    wallTop: "#77716a",
    wallEdge: "#292725",
    accent: "#d2b06f",
    accent2: "#8fd0c8",
  },
  ember: {
    bg0: "#140807",
    bg1: "#35130f",
    haze: "#9b3f25",
    floor: "#5f4437",
    floor2: "#705043",
    grout: "#382a25",
    wall: "#3e302b",
    wallTop: "#7b5545",
    wallEdge: "#251b18",
    accent: "#ff9652",
    accent2: "#ffd36a",
  },
  tide: {
    bg0: "#051015",
    bg1: "#0d2d38",
    haze: "#377e94",
    floor: "#4f686a",
    floor2: "#5e797b",
    grout: "#304447",
    wall: "#30474b",
    wallTop: "#658085",
    wallEdge: "#1b3034",
    accent: "#7de3ff",
    accent2: "#a6f0d2",
  },
  sanctum: {
    bg0: "#090813",
    bg1: "#241b3b",
    haze: "#7057a7",
    floor: "#635b74",
    floor2: "#756b89",
    grout: "#40394f",
    wall: "#3f3950",
    wallTop: "#756b8c",
    wallEdge: "#282238",
    accent: "#c8a7ff",
    accent2: "#77e4e8",
  },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function hash(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function playerDrawPos(s: LevelState, fx: ViewFx, id: CharId) {
  const p = s.players.find((c) => c.id === id)!;
  const tw = fx.tweens.find((t) => t.who === id);
  if (!tw) return { x: p.x, y: p.y, moving: false };
  const k = easeOut(Math.min(1, tw.t / tw.dur));
  return { x: lerp(tw.fromX, tw.toX, k), y: lerp(tw.fromY, tw.toY, k), moving: k < 1 };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: Theme,
  t: number,
) {
  const p = PALETTES[theme];
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, p.bg0);
  g.addColorStop(0.55, p.bg1);
  g.addColorStop(1, p.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const cx = width * (0.48 + Math.sin(t * 0.08) * 0.025);
  const cy = height * (0.43 + Math.cos(t * 0.07) * 0.025);
  const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.72);
  haze.addColorStop(0, p.haze);
  haze.addColorStop(0.35, "rgba(0,0,0,0.18)");
  haze.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 44; i++) {
    const seed = i * 17.17;
    const x = (hash(i, 2) * width + Math.sin(t * (0.08 + (i % 5) * 0.012) + seed) * 24 + width) % width;
    const y = (hash(i, 9) * height - t * (3 + (i % 4)) + height * 3) % height;
    const r = 0.8 + hash(i, 14) * 2.2;
    ctx.globalAlpha = 0.08 + hash(i, 6) * 0.16;
    ctx.fillStyle = i % 3 === 0 ? p.accent : p.accent2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  x: number,
  y: number,
  s: number,
  tx: number,
  ty: number,
  p: Palette,
) {
  ctx.drawImage(assets.tiles.floor, x, y, s, s);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = (tx + ty) % 2 === 0 ? p.floor : p.floor2;
  ctx.fillRect(x, y, s, s);
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = p.grout;
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  if (hash(tx, ty) > 0.72) {
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.22, y + s * 0.68);
    ctx.lineTo(x + s * 0.45, y + s * 0.52);
    ctx.lineTo(x + s * 0.62, y + s * 0.58);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  tx: number,
  ty: number,
  p: Palette,
) {
  const top = Math.max(5, s * 0.24);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + s * 0.08, y + s * 0.18, s, s * 0.9);

  ctx.fillStyle = p.wallEdge;
  ctx.fillRect(x, y + top * 0.65, s, s - top * 0.65);
  ctx.fillStyle = p.wall;
  ctx.fillRect(x + 1, y + top, s - 2, s - top - 2);

  const topG = ctx.createLinearGradient(x, y, x, y + top + 2);
  topG.addColorStop(0, p.wallTop);
  topG.addColorStop(1, p.wall);
  ctx.fillStyle = topG;
  ctx.fillRect(x + 1, y + 1, s - 2, top + 2);

  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 3, y + 2, s - 7, Math.max(2, s * 0.035));
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = p.accent;
  if (hash(tx + 1, ty + 3) > 0.63) {
    ctx.fillRect(x + s * 0.16, y + top * 0.35, s * 0.07, s * 0.05);
    ctx.fillRect(x + s * 0.21, y + top * 0.45, s * 0.04, s * 0.15);
  }
  ctx.restore();
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
  const w = opts?.w ?? tile * 1.2;
  const h = opts?.h ?? tile * 1.42;
  const dx = cx - w / 2;
  const dy = cy - h + tile * 0.12;
  ctx.save();
  ctx.globalAlpha = opts?.alpha ?? 1;
  ctx.drawImage(img, dx, dy, w, h);
  ctx.restore();
}

function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number, t: number, p: Palette) {
  const bob = Math.sin(t * 3.1 + x * 0.07) * tile * 0.055;
  const cx = x + tile / 2;
  const cy = y + tile * 0.48 + bob;
  drawGlow(ctx, cx, cy, tile * 0.72, p.accent, 0.28);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.75);
  const s = tile * 0.16;
  const g = ctx.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, p.accent2);
  g.addColorStop(1, p.accent);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.35);
  ctx.lineTo(s, 0);
  ctx.lineTo(0, s * 1.35);
  ctx.lineTo(-s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-s * 0.25, -s * 0.35, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = p.accent2;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, tile * 0.018);
  ctx.beginPath();
  ctx.arc(cx, cy, tile * (0.26 + Math.sin(t * 2.4) * 0.025), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: number,
  open: boolean,
  t: number,
) {
  const px = x + tile * 0.08;
  const py = y + tile * 0.05;
  const w = tile * 0.84;
  const h = tile * 0.92;
  ctx.save();
  ctx.globalAlpha = open ? 0.22 : 1;
  const g = ctx.createLinearGradient(px, py, px + w, py + h);
  g.addColorStop(0, "#6b3f25");
  g.addColorStop(0.5, "#3d2419");
  g.addColorStop(1, "#261711");
  ctx.fillStyle = g;
  roundedRect(ctx, px, py, w, h, tile * 0.08);
  ctx.fill();
  ctx.strokeStyle = "#b88a4b";
  ctx.lineWidth = Math.max(2, tile * 0.045);
  ctx.stroke();
  for (let i = 1; i < 4; i++) {
    ctx.globalAlpha = open ? 0.1 : 0.35;
    ctx.strokeStyle = "#d9aa61";
    ctx.lineWidth = Math.max(1, tile * 0.014);
    ctx.beginPath();
    ctx.moveTo(px + (w * i) / 4, py + tile * 0.09);
    ctx.lineTo(px + (w * i) / 4, py + h - tile * 0.08);
    ctx.stroke();
  }
  if (!open) {
    const cx = x + tile / 2;
    const cy = y + tile * 0.53;
    drawGlow(ctx, cx, cy, tile * 0.4, "#ffd86b", 0.18 + Math.sin(t * 3) * 0.03);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e6bd5c";
    roundedRect(ctx, cx - tile * 0.12, cy - tile * 0.02, tile * 0.24, tile * 0.2, tile * 0.035);
    ctx.fill();
    ctx.strokeStyle = "#fff0a2";
    ctx.lineWidth = Math.max(1, tile * 0.018);
    ctx.beginPath();
    ctx.arc(cx, cy - tile * 0.06, tile * 0.075, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  tile: number,
  t: number,
  active: boolean,
  p: Palette,
) {
  const cx = x + tile / 2;
  const cy = y + tile / 2;
  const pulse = 1 + 0.055 * Math.sin(t * 3.2);
  drawGlow(ctx, cx, cy, tile * 0.92, active ? p.accent2 : "#736a78", active ? 0.38 : 0.12);
  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.38;
  const s = tile * 0.86 * pulse;
  ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  ctx.strokeStyle = active ? p.accent2 : "#7b7282";
  ctx.globalAlpha = active ? 0.55 : 0.18;
  ctx.lineWidth = Math.max(1.5, tile * 0.025);
  ctx.beginPath();
  ctx.arc(cx, cy, tile * (0.35 + Math.sin(t * 2.6) * 0.02), t, t + Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.65, "rgba(0,0,0,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  assets: GameAssets,
  state: LevelState,
  fx: ViewFx,
  activeId: CharId,
) {
  const { width, height } = ctx.canvas;
  const p = PALETTES[state.theme];
  const t = fx.time;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, state.theme, t);

  const padX = Math.max(34, width * 0.06);
  const padY = Math.max(76, height * 0.12);
  const tile = Math.max(
    28,
    Math.floor(Math.min((width - padX * 2) / state.w, (height - padY * 2) / state.h, 150)),
  );
  const gw = state.w * tile;
  const gh = state.h * tile;
  const ox = Math.floor((width - gw) / 2) + fx.shakeX;
  const oy = Math.floor((height - gh) / 2) + fx.shakeY;
  const intro = easeOut(clamp01(fx.levelT / 0.52));
  const scale = 0.965 + intro * 0.035;
  const pressed = pressedChannels(state);
  const portalsActive = !state.requireOrbs || state.orbs.length === 0;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -height / 2);
  ctx.globalAlpha = 0.25 + intro * 0.75;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = tile * 0.8;
  ctx.shadowOffsetY = tile * 0.25;
  ctx.fillStyle = "rgba(12,10,10,0.7)";
  roundedRect(ctx, ox - tile * 0.26, oy - tile * 0.26, gw + tile * 0.52, gh + tile * 0.52, tile * 0.24);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = p.wallEdge;
  roundedRect(ctx, ox - tile * 0.16, oy - tile * 0.16, gw + tile * 0.32, gh + tile * 0.32, tile * 0.16);
  ctx.fill();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = Math.max(1, tile * 0.018);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(ox, oy);

  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      const cell = state.cells[y]![x]!;
      const px = x * tile;
      const py = y * tile;
      if (cell.terrain === "wall") continue;
      drawFloorTile(ctx, assets, px, py, tile, x, y, p);

      if (cell.terrain === "lava") {
        drawGlow(ctx, px + tile / 2, py + tile / 2, tile * 0.72, "#ff6b32", 0.22);
        ctx.globalAlpha = 0.94;
        ctx.drawImage(assets.tiles.lava, px, py, tile, tile);
        ctx.globalAlpha = 0.16 + 0.11 * Math.sin(t * 4.4 + x * 0.8);
        ctx.fillStyle = "#ff7b35";
        ctx.fillRect(px, py, tile, tile);
        ctx.globalAlpha = 1;
      }

      if (cell.terrain === "water") {
        drawGlow(ctx, px + tile / 2, py + tile / 2, tile * 0.67, "#4dd9ff", 0.12);
        ctx.globalAlpha = 0.92;
        ctx.drawImage(assets.tiles.water, px, py, tile, tile);
        ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 3.1 + y * 0.75);
        ctx.fillStyle = "#8ce9ff";
        ctx.fillRect(px, py, tile, tile);
        ctx.globalAlpha = 1;
      }

      if (cell.terrain === "exit") {
        drawPortal(ctx, assets.props.portal, px, py, tile, t + x * 0.18, portalsActive, p);
      }

      if (cell.plate) {
        const on = pressed.has(cell.plate);
        if (on) drawGlow(ctx, px + tile / 2, py + tile * 0.58, tile * 0.52, p.accent, 0.2);
        const img = on ? assets.props.plateOn : assets.props.plate;
        ctx.drawImage(img, px + tile * 0.08, py + tile * 0.18, tile * 0.84, tile * 0.7);
        ctx.save();
        ctx.font = `700 ${Math.max(10, tile * 0.16)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillStyle = on ? "#fff8cc" : "rgba(255,255,255,0.48)";
        ctx.fillText(String(cell.plate), px + tile / 2, py + tile * 0.72);
        ctx.restore();
      }
    }
  }

  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      const cell = state.cells[y]![x]!;
      if (cell.terrain === "wall") drawWall(ctx, x * tile, y * tile, tile, x, y, p);
      if (cell.gate) {
        const open = pressed.has(cell.gate);
        ctx.save();
        ctx.globalAlpha = open ? 0.2 : 1;
        if (!open) drawGlow(ctx, x * tile + tile / 2, y * tile + tile / 2, tile * 0.5, p.accent, 0.08);
        ctx.drawImage(
          assets.props.gate,
          x * tile + tile * 0.05,
          y * tile - tile * 0.12,
          tile * 0.9,
          tile * 1.12,
        );
        ctx.restore();
      }
      if (cell.door) drawDoor(ctx, x * tile, y * tile, tile, state.hasKey, t);
    }
  }

  for (const orb of state.orbs) {
    drawOrb(ctx, orb.x * tile, orb.y * tile, tile, t + orb.x * 0.31 + orb.y * 0.17, p);
  }

  for (const key of state.keys) {
    const cx = key.x * tile + tile / 2;
    const cy = key.y * tile + tile * (0.47 + Math.sin(t * 2.8) * 0.045);
    drawGlow(ctx, cx, cy, tile * 0.68, "#ffd65c", 0.25);
    const s = tile * 0.62;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 1.8) * 0.1);
    ctx.drawImage(assets.props.key, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  type DrawItem = { y: number; z: number; draw: () => void };
  const items: DrawItem[] = [];

  for (const o of state.objects) {
    items.push({
      y: o.y,
      z: 1,
      draw: () => {
        const cx = o.x * tile + tile / 2;
        const cy = o.y * tile + tile * 0.88;
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, cy, tile * 0.34, tile * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (o.kind === "ice") drawGlow(ctx, cx, o.y * tile + tile * 0.5, tile * 0.52, "#8deeff", 0.12);
        if (o.kind === "wood" && state.theme === "ember") drawGlow(ctx, cx, o.y * tile + tile * 0.5, tile * 0.42, "#ff8a42", 0.07);
        const img = o.kind === "wood" ? assets.props.crate : o.kind === "ice" ? assets.props.ice : assets.props.box;
        ctx.drawImage(img, o.x * tile + tile * 0.06, o.y * tile - tile * 0.08, tile * 0.88, tile * 0.96);
      },
    });
  }

  for (const pl of state.players) {
    const pos = playerDrawPos(state, fx, pl.id);
    items.push({
      y: pos.y,
      z: 2,
      draw: () => {
        const pack = pl.id === "osea" ? assets.osea : assets.lois;
        const ab = fx.ability && fx.ability.who === pl.id ? fx.ability : null;
        let img: HTMLImageElement | undefined;
        if (ab) {
          const idx = Math.min(15, Math.floor((ab.t / ab.dur) * 15));
          img = pack.atk[idx];
        } else {
          const frames = pack.walk[pl.dir];
          const fi = pos.moving ? Math.floor(t * 9) % 4 : 0;
          img = frames[fi];
        }
        const cx = pos.x * tile + tile / 2;
        const cy = pos.y * tile + tile * 0.94;
        const isActive = pl.id === activeId;
        const aura = pl.id === "osea" ? "#ff7651" : "#66ddff";

        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, tile * 0.34, tile * 0.115, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (isActive) {
          drawGlow(ctx, cx, cy - tile * 0.28, tile * 0.75, aura, 0.11);
          ctx.save();
          ctx.strokeStyle = aura;
          ctx.globalAlpha = 0.58 + Math.sin(t * 4) * 0.12;
          ctx.lineWidth = Math.max(2, tile * 0.032);
          ctx.beginPath();
          ctx.ellipse(cx, cy - 1, tile * 0.39, tile * 0.145, 0, 0, Math.PI * 2);
          ctx.stroke();
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
    const img = frames[Math.floor(t * 13) % frames.length];
    const cx = pr.x * tile + tile / 2;
    const cy = pr.y * tile + tile / 2;
    const glowColor = pr.kind === "fire" ? "#ff713d" : "#6fe7ff";
    drawGlow(ctx, cx, cy, tile * 0.66, glowColor, 0.38);
    if (img) {
      const s = tile * 0.78;
      ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
    }
  }

  for (const part of fx.particles) {
    const a = Math.max(0, part.life / part.max);
    const px = part.x * tile;
    const py = part.y * tile;
    drawGlow(ctx, px, py, Math.max(7, part.size * 3.2), part.color, a * 0.22);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.2, part.size * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (fx.winT > 0) {
    const k = clamp01(fx.winT / 1.1);
    ctx.save();
    ctx.globalAlpha = Math.min(0.22, k * 0.22);
    ctx.fillStyle = "#fff6d7";
    ctx.fillRect(-ox, -oy, width, height);
    for (let i = 0; i < 36; i++) {
      const a = i * 2.399;
      const r = tile * (0.5 + k * (1.1 + (i % 7) * 0.18));
      const cx = gw / 2 + Math.cos(a) * r;
      const cy = gh / 2 + Math.sin(a) * r * 0.55;
      ctx.globalAlpha = (1 - k * 0.65) * 0.8;
      ctx.fillStyle = i % 2 ? p.accent : p.accent2;
      ctx.fillRect(cx, cy, Math.max(2, tile * 0.04), Math.max(2, tile * 0.04));
    }
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
  drawVignette(ctx, width, height);
}

export function computeTile(canvas: HTMLCanvasElement, w: number, h: number) {
  const padX = Math.max(34, canvas.width * 0.06);
  const padY = Math.max(76, canvas.height * 0.12);
  return Math.max(28, Math.floor(Math.min((canvas.width - padX * 2) / w, (canvas.height - padY * 2) / h, 150)));
}
