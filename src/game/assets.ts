export type DirName = "up" | "down" | "left" | "right";

export interface GameAssets {
  osea: { walk: Record<DirName, HTMLImageElement[]>; atk: HTMLImageElement[] };
  lois: { walk: Record<DirName, HTMLImageElement[]>; atk: HTMLImageElement[] };
  fx: { fire: HTMLImageElement[]; bubble: HTMLImageElement[] };
  tiles: { floor: HTMLImageElement; lava: HTMLImageElement; water: HTMLImageElement };
  props: {
    box: HTMLImageElement;
    crate: HTMLImageElement;
    ice: HTMLImageElement;
    plate: HTMLImageElement;
    plateOn: HTMLImageElement;
    portal: HTMLImageElement;
    gate: HTMLImageElement;
    key: HTMLImageElement;
  };
}

function assetUrl(path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${clean}`;
}

function loadImage(path: string) {
  const src = assetUrl(path);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadMany(paths: string[]) {
  return Promise.all(paths.map(loadImage));
}

export async function loadAssets(): Promise<GameAssets> {
  const dirs: DirName[] = ["down", "left", "right", "up"];
  const walk = (who: string) =>
    Promise.all(
      dirs.map(async (d) => {
        const frames = await loadMany([1, 2, 3, 4].map((n) => `sprites/${who}/${d}-${n}.png`));
        return [d, frames] as const;
      }),
    ).then((pairs) => Object.fromEntries(pairs) as Record<DirName, HTMLImageElement[]>);

  const atk = (who: string) =>
    loadMany(Array.from({ length: 16 }, (_, i) => `sprites/${who}/atk-${String(i).padStart(2, "0")}.png`));

  const [
    oseaWalk,
    loisWalk,
    oseaAtk,
    loisAtk,
    fire,
    bubble,
    floor,
    lava,
    water,
    box,
    crate,
    ice,
    plate,
    plateOn,
    portal,
    gate,
    key,
  ] = await Promise.all([
    walk("osea"),
    walk("lois"),
    atk("osea"),
    atk("lois"),
    loadMany([1, 2, 3, 4].map((n) => `sprites/fx/fire-${n}.png`)),
    loadMany([1, 2, 3, 4].map((n) => `sprites/fx/bubble-${n}.png`)),
    loadImage("tiles/floor.png"),
    loadImage("tiles/lava.png"),
    loadImage("tiles/water.png"),
    loadImage("props/box.png"),
    loadImage("props/crate.png"),
    loadImage("props/ice.png"),
    loadImage("props/plate.png"),
    loadImage("props/plate-on.png"),
    loadImage("props/portal.png"),
    loadImage("props/gate.png"),
    loadImage("props/key.png"),
  ]);

  return {
    osea: { walk: oseaWalk, atk: oseaAtk },
    lois: { walk: loisWalk, atk: loisAtk },
    fx: { fire, bubble },
    tiles: { floor, lava, water },
    props: { box, crate, ice, plate, plateOn, portal, gate, key },
  };
}
