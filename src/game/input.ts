const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "KeyE",
  "KeyQ",
  "Tab",
  "KeyZ",
  "KeyU",
  "KeyR",
  "Escape",
  "Enter",
  "KeyP",
]);

export interface Actions {
  moveX: number;
  moveY: number;
  ability: boolean;
  switchChar: boolean;
  undo: boolean;
  reset: boolean;
  pause: boolean;
  confirm: boolean;
}

export function createInput() {
  const held = new Set<string>();
  let injected: string[] | null = null;
  const prev = {
    ability: false,
    switchChar: false,
    undo: false,
    reset: false,
    pause: false,
    confirm: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };

  function codes(): Set<string> {
    if (injected) return new Set(injected);
    return held;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    held.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent) {
    held.delete(e.code);
  }
  function clear() {
    held.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });

  const tap = new Set<string>();

  function tapAction(code: string) {
    tap.add(code);
  }

  function poll(): { held: Actions; just: Actions } {
    const src = new Set([...codes(), ...tap]);
    tap.clear();

    const left = src.has("KeyA") || src.has("ArrowLeft");
    const right = src.has("KeyD") || src.has("ArrowRight");
    const up = src.has("KeyW") || src.has("ArrowUp");
    const down = src.has("KeyS") || src.has("ArrowDown");

    const heldAct: Actions = {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      moveY: (down ? 1 : 0) - (up ? 1 : 0),
      ability: src.has("Space") || src.has("KeyE"),
      switchChar: src.has("Tab") || src.has("KeyQ"),
      undo: src.has("KeyZ") || src.has("KeyU"),
      reset: src.has("KeyR"),
      pause: src.has("Escape") || src.has("KeyP"),
      confirm: src.has("Enter") || src.has("Space"),
    };

    const just: Actions = {
      moveX: 0,
      moveY: 0,
      ability: heldAct.ability && !prev.ability,
      switchChar: heldAct.switchChar && !prev.switchChar,
      undo: heldAct.undo && !prev.undo,
      reset: heldAct.reset && !prev.reset,
      pause: heldAct.pause && !prev.pause,
      confirm: heldAct.confirm && !prev.confirm,
    };
    if (left && !prev.left) just.moveX -= 1;
    if (right && !prev.right) just.moveX += 1;
    if (up && !prev.up) just.moveY -= 1;
    if (down && !prev.down) just.moveY += 1;

    prev.ability = heldAct.ability;
    prev.switchChar = heldAct.switchChar;
    prev.undo = heldAct.undo;
    prev.reset = heldAct.reset;
    prev.pause = heldAct.pause;
    prev.confirm = heldAct.confirm;
    prev.left = left;
    prev.right = right;
    prev.up = up;
    prev.down = down;

    return { held: heldAct, just };
  }

  function setKeys(list: string[]) {
    injected = list.length ? [...list] : null;
  }

  function destroy() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clear);
  }

  return { poll, tapAction, setKeys, destroy, held };
}

export type GameInput = ReturnType<typeof createInput>;
