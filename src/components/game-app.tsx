import { useEffect, useRef, useState } from "react";
import {
  Flame,
  Play,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  Pause,
  BookOpen,
  Grid3x3,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ArrowLeft,
  Droplets,
} from "lucide-react";
import { bootEngine, LEVELS, type Engine, type UiSnapshot } from "@/game/engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptyUi = (): UiSnapshot => ({
  screen: "title",
  levelIndex: 0,
  title: "",
  hint: "",
  lesson: "",
  active: "osea",
  moves: 0,
  muted: false,
  save: {
    version: 1,
    unlocked: 1,
    completed: Array.from({ length: 10 }, () => false),
    lastLevel: 0,
    muted: false,
  },
  won: false,
  ready: false,
  loadError: null,
});

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [ui, setUi] = useState<UiSnapshot>(emptyUi);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let instance: Engine | null = null;
    void bootEngine(canvas, (next) => {
      if (alive) setUi(next);
    }).then((eng) => {
      instance = eng;
      if (!alive) {
        eng.destroy();
        return;
      }
      setEngine(eng);
    });
    return () => {
      alive = false;
      instance?.destroy();
    };
  }, []);

  const playing = ui.screen === "play";
  const overlay = ui.screen !== "play";

  function start(i?: number) {
    engine?.unlock();
    engine?.playLevel(i ?? Math.max(0, ui.save.lastLevel));
  }

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg"
      onPointerDown={() => engine?.unlock()}
      onKeyDown={() => engine?.unlock()}
    >
      <div
        className={cn(
          "relative min-h-0 flex-1",
          overlay && "pointer-events-none opacity-40 blur-[2px]",
        )}
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {playing && (
        <>
          <Hud ui={ui} onPause={() => engine?.setScreen("pause")} onMute={() => engine?.toggleMute()} />
          <TouchPad
            onTap={(c) => engine?.tap(c)}
            active={ui.active}
            onSwitch={() => engine?.tap("Tab")}
          />
        </>
      )}

      {ui.screen === "title" && (
        <TitleScreen
          ui={ui}
          canPlay={Boolean(engine) && ui.ready}
          onPlay={() => start()}
          onHow={() => engine?.setScreen("how")}
          onSelect={() => engine?.setScreen("select")}
        />
      )}
      {ui.screen === "how" && <HowScreen onBack={() => engine?.setScreen("title")} onPlay={() => start(0)} />}
      {ui.screen === "select" && (
        <SelectScreen ui={ui} onBack={() => engine?.setScreen("title")} onPick={(i) => start(i)} />
      )}
      {ui.screen === "pause" && (
        <PauseScreen
          ui={ui}
          onResume={() => engine?.setScreen("play")}
          onReset={() => engine?.playLevel(ui.levelIndex)}
          onSelect={() => engine?.setScreen("select")}
          onMute={() => engine?.toggleMute()}
        />
      )}
      {ui.screen === "win" && (
        <WinScreen
          ui={ui}
          onNext={() => (ui.levelIndex < LEVELS.length - 1 ? engine?.nextLevel() : engine?.setScreen("select"))}
          onReplay={() => engine?.playLevel(ui.levelIndex)}
          onSelect={() => engine?.setScreen("select")}
        />
      )}
    </div>
  );
}

function Hud({
  ui,
  onPause,
  onMute,
}: {
  ui: UiSnapshot;
  onPause: () => void;
  onMute: () => void;
}) {
  const osea = ui.active === "osea";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={onPause} aria-label="Pauză">
          <Pause className="size-5" />
        </Button>
        <Button variant="secondary" size="icon" onClick={onMute} aria-label="Sunet">
          {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-surface/90 px-3 py-2 text-center shadow-[var(--shadow-panel)] backdrop-blur-sm">
        <p className="font-display text-sm tracking-tight text-muted">
          Nivel {ui.levelIndex + 1} · {ui.lesson}
        </p>
        <p className="font-display text-lg font-semibold leading-tight">{ui.title}</p>
        <p className="mt-0.5 hidden max-w-xs text-xs leading-snug text-muted lg:block">{ui.hint}</p>
      </div>
      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-right shadow-[var(--shadow-panel)]",
          osea ? "border-osea/50 bg-osea/20" : "border-lois/50 bg-lois/20",
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Controlezi</p>
        <p className="font-display text-lg font-semibold">{osea ? "Osea" : "Lois"}</p>
        <p className="text-xs tabular-nums text-muted">{ui.moves} mutări</p>
      </div>
    </div>
  );
}

function TouchPad({
  onTap,
  active,
  onSwitch,
}: {
  onTap: (code: string) => void;
  active: "osea" | "lois";
  onSwitch: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-5">
      <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1.5">
        <span />
        <PadBtn label="Sus" onPress={() => onTap("ArrowUp")}>
          <ChevronUp className="size-6" />
        </PadBtn>
        <span />
        <PadBtn label="Stânga" onPress={() => onTap("ArrowLeft")}>
          <ChevronLeft className="size-6" />
        </PadBtn>
        <PadBtn label="Jos" onPress={() => onTap("ArrowDown")}>
          <ChevronDown className="size-6" />
        </PadBtn>
        <PadBtn label="Dreapta" onPress={() => onTap("ArrowRight")}>
          <ChevronRight className="size-6" />
        </PadBtn>
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="hidden max-w-xs rounded-md border border-border bg-surface/80 px-3 py-2 text-xs text-muted sm:block">
          Tab schimbă · Spațiu abilitate · Z anulează · R reset
        </div>
        <div className="flex gap-2">
          <PadBtn label="Anulează" onPress={() => onTap("KeyZ")}>
            <Undo2 className="size-5" />
          </PadBtn>
          <PadBtn label="Reset" onPress={() => onTap("KeyR")}>
            <RotateCcw className="size-5" />
          </PadBtn>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onSwitch();
            }}
            className="flex h-14 min-w-24 items-center justify-center rounded-lg border border-border bg-surface-2 px-4 font-display text-base font-semibold"
          >
            Schimbă
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onTap("Space");
            }}
            className={cn(
              "flex h-14 min-w-24 items-center justify-center gap-2 rounded-lg px-4 font-display text-base font-semibold text-fg",
              active === "osea" ? "bg-osea" : "bg-lois",
            )}
          >
            {active === "osea" ? <Flame className="size-5" /> : <Droplets className="size-5" />}
            {active === "osea" ? "Foc" : "Bule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PadBtn({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="flex size-14 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg"
    >
      {children}
    </button>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("absolute inset-0 z-20 flex items-center justify-center p-4", className)}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-panel)] sm:p-8">
        {children}
      </div>
    </div>
  );
}

function TitleScreen({
  ui,
  canPlay,
  onPlay,
  onHow,
  onSelect,
}: {
  ui: UiSnapshot;
  canPlay: boolean;
  onPlay: () => void;
  onHow: () => void;
  onSelect: () => void;
}) {
  return (
    <Panel>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Puzzle cooperativ</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Osea <span className="text-muted">&</span> Lois
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
        Doi copii, un labirint. Împinge cutii, arde lemne, sparge gheață și treceți amândoi prin portal.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-sm bg-osea/20 px-3 py-1.5 text-sm font-semibold text-osea">
          <Flame className="size-4" /> Osea · foc
        </span>
        <span className="inline-flex items-center gap-2 rounded-sm bg-lois/20 px-3 py-1.5 text-sm font-semibold text-lois">
          <Droplets className="size-4" /> Lois · bule
        </span>
      </div>
      {ui.loadError && <p className="mt-4 text-sm text-danger">{ui.loadError}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onPlay} disabled={!canPlay}>
          <Play className="size-5" />
          Joacă
        </Button>
        <Button size="lg" variant="secondary" onClick={onSelect}>
          <Grid3x3 className="size-5" />
          Nivele
        </Button>
        <Button size="lg" variant="ghost" onClick={onHow}>
          <BookOpen className="size-5" />
          Cum se joacă
        </Button>
      </div>
    </Panel>
  );
}

function HowScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const rows = [
    { k: "WASD / săgeți", v: "Mută personajul activ" },
    { k: "Tab sau Q", v: "Schimbă între Osea și Lois" },
    { k: "Spațiu", v: "Osea arde lemn · Lois sparge gheață" },
    { k: "Z", v: "Anulează ultima mutare" },
    { k: "R", v: "Resetează nivelul" },
  ];
  return (
    <Panel>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Înapoi
      </button>
      <h2 className="font-display text-3xl font-semibold">Cum se joacă</h2>
      <p className="mt-2 text-muted">
        Trebuie să ajungeți <em className="text-fg">amândoi</em> pe portal. Personajele se blochează între ele, deci gândiți-vă ca o echipă.
      </p>
      <ul className="mt-5 space-y-2">
        {rows.map((r) => (
          <li key={r.k} className="flex items-baseline justify-between gap-4 rounded-md bg-surface-2 px-3 py-2">
            <span className="font-display font-semibold">{r.k}</span>
            <span className="text-sm text-muted">{r.v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm leading-relaxed text-muted">
        Lava o trece doar Osea. Apa o trece doar Lois. O cutie împinsă pe lava sau apă devine pod.
      </p>
      <Button className="mt-6" size="lg" onClick={onPlay}>
        Începe nivelul 1
      </Button>
    </Panel>
  );
}

function SelectScreen({
  ui,
  onBack,
  onPick,
}: {
  ui: UiSnapshot;
  onBack: () => void;
  onPick: (i: number) => void;
}) {
  return (
    <Panel className="items-stretch overflow-auto">
      <div className="mx-auto w-full max-w-lg py-4">
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Înapoi
        </button>
        <h2 className="font-display text-3xl font-semibold">Nivele</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {LEVELS.map((lv, i) => {
            const locked = i >= ui.save.unlocked;
            const done = ui.save.completed[i];
            return (
              <button
                key={lv.id}
                type="button"
                disabled={locked}
                onClick={() => onPick(i)}
                className={cn(
                  "flex min-h-20 flex-col items-start rounded-lg border px-3 py-3 text-left",
                  locked ? "border-border bg-surface-2 text-faint" : "border-border bg-surface-2 hover:border-primary",
                  done && "border-primary/50",
                )}
              >
                <span className="text-xs text-muted">{done ? "Gata" : locked ? "Blocat" : lv.lesson}</span>
                <span className="font-display text-lg font-semibold">{i + 1}</span>
                <span className="text-xs text-muted">{lv.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function PauseScreen({
  ui,
  onResume,
  onReset,
  onSelect,
  onMute,
}: {
  ui: UiSnapshot;
  onResume: () => void;
  onReset: () => void;
  onSelect: () => void;
  onMute: () => void;
}) {
  return (
    <Panel>
      <h2 className="font-display text-3xl font-semibold">Pauză</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{ui.hint}</p>
      <div className="mt-6 flex flex-col gap-3">
        <Button size="lg" onClick={onResume}>
          Continuă
        </Button>
        <Button size="lg" variant="secondary" onClick={onReset}>
          <RotateCcw className="size-4" /> Reia nivelul
        </Button>
        <Button size="lg" variant="ghost" onClick={onMute}>
          {ui.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {ui.muted ? "Sunet oprit" : "Sunet pornit"}
        </Button>
        <Button size="lg" variant="ghost" onClick={onSelect}>
          Alege nivel
        </Button>
      </div>
    </Panel>
  );
}

function WinScreen({
  ui,
  onNext,
  onReplay,
  onSelect,
}: {
  ui: UiSnapshot;
  onNext: () => void;
  onReplay: () => void;
  onSelect: () => void;
}) {
  const last = ui.levelIndex >= LEVELS.length - 1;
  return (
    <Panel>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Portal atins</p>
      <h2 className="mt-1 font-display text-3xl font-semibold">{ui.title}</h2>
      <p className="mt-2 text-muted">
        {ui.moves} mutări. {last ? "Ați terminat toate nivelele." : "Gata pentru următorul stagiu?"}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onNext}>
          {last ? "Nivele" : "Următorul"}
          <ChevronRight className="size-5" />
        </Button>
        <Button size="lg" variant="secondary" onClick={onReplay}>
          Reia
        </Button>
        <Button size="lg" variant="ghost" onClick={onSelect}>
          Hartă
        </Button>
      </div>
    </Panel>
  );
}
