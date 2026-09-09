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
  Star,
  KeyRound,
  Sparkles,
  Trophy,
  Lock,
  Map,
} from "lucide-react";
import { bootEngine, LEVELS, type Engine, type UiSnapshot } from "@/game/engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptyUi = (): UiSnapshot => ({
  screen: "title",
  levelIndex: 0,
  title: "",
  chapter: "",
  hint: "",
  lesson: "",
  par: 0,
  active: "osea",
  moves: 0,
  orbsCollected: 0,
  orbsTotal: 0,
  hasKey: false,
  muted: false,
  save: {
    version: 2,
    unlocked: 1,
    completed: Array.from({ length: LEVELS.length }, () => false),
    lastLevel: 0,
    muted: false,
    medals: Array.from({ length: LEVELS.length }, () => 0),
    bestMoves: Array.from({ length: LEVELS.length }, () => null),
    bestOrbs: Array.from({ length: LEVELS.length }, () => 0),
  },
  medal: 0,
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
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#050608] text-fg selection:bg-primary/30"
      onPointerDown={() => engine?.unlock()}
      onKeyDown={() => engine?.unlock()}
    >
      <div
        className={cn(
          "relative min-h-0 flex-1 transition duration-500",
          overlay && "pointer-events-none scale-[1.015] opacity-45 blur-[3px]",
        )}
        style={{ touchAction: "none" }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_30%,rgba(0,0,0,0.34)_100%)]" />

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

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl", className)}>
      {children}
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
  const overPar = ui.moves > ui.par;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:p-5">
      <div className="pointer-events-auto flex items-center gap-2 justify-self-start">
        <Button variant="secondary" size="icon" onClick={onPause} aria-label="Pauză" className="border-white/10 bg-black/55 backdrop-blur-xl">
          <Pause className="size-5" />
        </Button>
        <Button variant="secondary" size="icon" onClick={onMute} aria-label="Sunet" className="hidden border-white/10 bg-black/55 backdrop-blur-xl sm:inline-flex">
          {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </Button>
      </div>

      <Glass className="rounded-2xl px-4 py-2 text-center md:min-w-72 md:px-6 md:py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary md:text-xs">
          {ui.chapter} · Nivel {ui.levelIndex + 1}
        </p>
        <p className="mt-0.5 font-display text-base font-bold leading-tight md:text-xl">{ui.title}</p>
        <p className="mt-1 hidden max-w-md text-xs leading-snug text-muted xl:block">{ui.hint}</p>
      </Glass>

      <div className="pointer-events-none flex items-start justify-end gap-2">
        {ui.orbsTotal > 0 && (
          <Glass className="hidden rounded-xl px-3 py-2 sm:block">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Sparkles className="size-4 text-violet-300" />
              <span>{ui.orbsCollected}/{ui.orbsTotal}</span>
            </div>
          </Glass>
        )}
        {ui.hasKey && (
          <Glass className="hidden rounded-xl px-3 py-2 md:block">
            <KeyRound className="size-4 text-amber-300" />
          </Glass>
        )}
        <Glass
          className={cn(
            "rounded-xl px-3 py-2 text-right",
            osea ? "border-osea/30" : "border-lois/30",
          )}
        >
          <p className={cn("text-xs font-bold", osea ? "text-osea" : "text-lois")}>{osea ? "OSEA · FOC" : "LOIS · APĂ"}</p>
          <p className={cn("text-xs tabular-nums", overPar ? "text-amber-300" : "text-muted")}>
            {ui.moves} / {ui.par} mutări
          </p>
        </Glass>
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
      <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1.5 opacity-80 transition hover:opacity-100 md:hidden">
        <span />
        <PadBtn label="Sus" onPress={() => onTap("ArrowUp")}><ChevronUp className="size-6" /></PadBtn>
        <span />
        <PadBtn label="Stânga" onPress={() => onTap("ArrowLeft")}><ChevronLeft className="size-6" /></PadBtn>
        <PadBtn label="Jos" onPress={() => onTap("ArrowDown")}><ChevronDown className="size-6" /></PadBtn>
        <PadBtn label="Dreapta" onPress={() => onTap("ArrowRight")}><ChevronRight className="size-6" /></PadBtn>
      </div>
      <div className="hidden md:block" />

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <Glass className="hidden rounded-xl px-3 py-2 text-[11px] text-muted lg:block">
          WASD mișcare · Tab schimbă · Space abilitate · Z undo · R restart
        </Glass>
        <div className="flex gap-2">
          <PadBtn label="Anulează" onPress={() => onTap("KeyZ")}><Undo2 className="size-5" /></PadBtn>
          <PadBtn label="Reset" onPress={() => onTap("KeyR")}><RotateCcw className="size-5" /></PadBtn>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onSwitch();
            }}
            className="flex h-14 min-w-24 items-center justify-center rounded-xl border border-white/10 bg-black/55 px-4 font-display text-sm font-bold shadow-xl backdrop-blur-xl transition hover:bg-white/10 active:scale-95"
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
              "flex h-14 min-w-28 items-center justify-center gap-2 rounded-xl px-4 font-display text-sm font-bold text-white shadow-2xl transition hover:brightness-110 active:scale-95",
              active === "osea"
                ? "bg-gradient-to-br from-orange-500 to-red-700 shadow-orange-900/40"
                : "bg-gradient-to-br from-cyan-500 to-blue-700 shadow-cyan-900/40",
            )}
          >
            {active === "osea" ? <Flame className="size-5" /> : <Droplets className="size-5" />}
            {active === "osea" ? "Flacără" : "Bule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PadBtn({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="flex size-14 items-center justify-center rounded-xl border border-white/10 bg-black/55 text-fg shadow-xl backdrop-blur-xl transition hover:bg-white/10 active:scale-90"
    >
      {children}
    </button>
  );
}

function Panel({
  children,
  className,
  cardClassName,
}: {
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={cn("absolute inset-0 z-20 flex items-center justify-center overflow-auto bg-black/20 p-4 backdrop-blur-[2px]", className)}>
      <div
        className={cn(
          "relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#181713]/95 via-[#11110f]/95 to-[#0a0b0d]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.7)] sm:p-8",
          cardClassName,
        )}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-lois/10 blur-3xl" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const sizes = size === "lg" ? "size-9" : size === "sm" ? "size-3.5" : "size-5";
  return (
    <div className="flex items-center gap-1" aria-label={`${value} stele`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={cn(sizes, n <= value ? "fill-amber-300 text-amber-300" : "text-white/15")} />
      ))}
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
  const completed = ui.save.completed.filter(Boolean).length;
  const stars = ui.save.medals.reduce((a, b) => a + b, 0);
  return (
    <Panel>
      <div className="grid gap-8 md:grid-cols-[1.35fr_0.65fr] md:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-4" /> Elemental Puzzle Adventure
          </div>
          <h1 className="font-display text-5xl font-black tracking-[-0.04em] sm:text-6xl">
            Osea <span className="text-white/25">&</span> Lois
          </h1>
          <p className="mt-2 font-display text-xl font-semibold text-primary">Inima Labirintului</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Două puteri. Un singur drum. Explorează temple elementale, aprinde mecanisme vechi, sparge gheața, mută poduri, adună fragmente astrale și deschide sigiliile împreună.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-osea/25 bg-osea/10 px-3 py-1.5 text-xs font-bold text-orange-300"><Flame className="size-4" /> Osea · foc</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-lois/25 bg-lois/10 px-3 py-1.5 text-xs font-bold text-cyan-300"><Droplets className="size-4" /> Lois · apă</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-200"><Sparkles className="size-4" /> fragmente astrale</span>
          </div>

          {ui.loadError && <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{ui.loadError}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onPlay} disabled={!canPlay} className="min-w-36 shadow-xl shadow-primary/10">
              <Play className="size-5" /> {completed ? "Continuă" : "Începe aventura"}
            </Button>
            <Button size="lg" variant="secondary" onClick={onSelect} className="border-white/10 bg-white/5">
              <Map className="size-5" /> Harta
            </Button>
            <Button size="lg" variant="ghost" onClick={onHow}>
              <BookOpen className="size-5" /> Ghid
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <Glass className="rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Campanie</p>
            <p className="mt-1 font-display text-3xl font-black">{completed}<span className="text-base text-muted">/{LEVELS.length}</span></p>
            <p className="text-xs text-muted">nivele terminate</p>
          </Glass>
          <Glass className="rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Măiestrie</p>
            <div className="mt-1 flex items-center gap-2"><Trophy className="size-6 text-amber-300" /><span className="font-display text-3xl font-black">{stars}</span></div>
            <p className="text-xs text-muted">din {LEVELS.length * 3} stele</p>
          </Glass>
        </div>
      </div>
    </Panel>
  );
}

function HowScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const rows = [
    { k: "WASD / săgeți", v: "Mută personajul activ" },
    { k: "Tab sau Q", v: "Schimbă între Osea și Lois" },
    { k: "Spațiu", v: "Folosește puterea elementală" },
    { k: "Z", v: "Anulează exact ultima acțiune" },
    { k: "R", v: "Resetează nivelul" },
  ];
  return (
    <Panel>
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="size-4" /> Înapoi
      </button>
      <div className="grid gap-7 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Manualul aventurierului</p>
          <h2 className="mt-2 font-display text-4xl font-black">Cum se joacă</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Scopul este să ajungă <strong className="text-fg">amândoi</strong> pe portaluri. Uneori portalurile cer toate fragmentele astrale. Personajele, cutiile și porțile se influențează reciproc.
          </p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex gap-3 rounded-xl border border-orange-400/15 bg-orange-400/5 p-3"><Flame className="mt-0.5 size-5 shrink-0 text-orange-300" /><span><strong>Osea</strong> trece lava și arde lemnul de la distanță.</span></div>
            <div className="flex gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3"><Droplets className="mt-0.5 size-5 shrink-0 text-cyan-300" /><span><strong>Lois</strong> trece apa și sparge cristalele de gheață.</span></div>
            <div className="flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-amber-300" /><span><strong>Cheile</strong> deschid ușile aurii pentru întreaga echipă.</span></div>
            <div className="flex gap-3 rounded-xl border border-violet-300/15 bg-violet-300/5 p-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-violet-300" /><span><strong>Fragmentele</strong> trezesc portalurile în nivelurile sigilate.</span></div>
          </div>
        </div>
        <div>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.k} className="flex items-baseline justify-between gap-4 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
                <span className="font-display text-sm font-bold">{r.k}</span>
                <span className="text-right text-xs text-muted">{r.v}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Bonus: o cutie împinsă pe apă sau lavă devine pod. Plăcile numerotate deschid porțile cu litera corespunzătoare. Primești până la 3 stele în funcție de numărul de mutări.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={onPlay}>Începe nivelul 1 <ChevronRight className="size-5" /></Button>
        </div>
      </div>
    </Panel>
  );
}

function SelectScreen({ ui, onBack, onPick }: { ui: UiSnapshot; onBack: () => void; onPick: (i: number) => void }) {
  const stars = ui.save.medals.reduce((a, b) => a + b, 0);
  return (
    <Panel className="items-stretch" cardClassName="my-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"><ArrowLeft className="size-4" /> Înapoi</button>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Campania</p>
          <h2 className="font-display text-4xl font-black">Harta Labirintului</h2>
        </div>
        <Glass className="rounded-xl px-4 py-2">
          <div className="flex items-center gap-2"><Trophy className="size-4 text-amber-300" /><strong>{stars}</strong><span className="text-xs text-muted">/ {LEVELS.length * 3} stele</span></div>
        </Glass>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LEVELS.map((lv, i) => {
          const locked = i >= ui.save.unlocked;
          const done = ui.save.completed[i];
          const medal = ui.save.medals[i] ?? 0;
          const best = ui.save.bestMoves[i];
          return (
            <button
              key={lv.id}
              type="button"
              disabled={locked}
              onClick={() => onPick(i)}
              className={cn(
                "group relative min-h-32 overflow-hidden rounded-2xl border p-4 text-left transition duration-200",
                locked
                  ? "cursor-not-allowed border-white/5 bg-white/[0.025] text-faint"
                  : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white/[0.08] hover:shadow-xl",
                done && "border-primary/20",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-2xl font-black text-white/90">{String(i + 1).padStart(2, "0")}</span>
                {locked ? <Lock className="size-4 text-white/20" /> : <Stars value={medal} size="sm" />}
              </div>
              <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80">{lv.chapter}</p>
              <p className="mt-0.5 font-display text-sm font-bold leading-tight">{lv.title}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>{lv.lesson}</span>
                {!locked && <span>{best !== null && best !== undefined ? `${best} best` : `par ${lv.par}`}</span>}
              </div>
            </button>
          );
        })}
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
    <Panel cardClassName="max-w-lg">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{ui.chapter}</p>
      <h2 className="mt-1 font-display text-4xl font-black">Pauză</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{ui.hint}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white/5 px-3 py-1.5">{ui.moves}/{ui.par} mutări</span>
        {ui.orbsTotal > 0 && <span className="rounded-full bg-violet-300/10 px-3 py-1.5 text-violet-200">✦ {ui.orbsCollected}/{ui.orbsTotal}</span>}
        {ui.hasKey && <span className="rounded-full bg-amber-300/10 px-3 py-1.5 text-amber-200">🔑 cheie găsită</span>}
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={onResume}>Continuă</Button>
        <Button size="lg" variant="secondary" onClick={onReset}><RotateCcw className="size-4" /> Reia nivelul</Button>
        <Button size="lg" variant="ghost" onClick={onMute}>{ui.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}{ui.muted ? "Sunet oprit" : "Sunet pornit"}</Button>
        <Button size="lg" variant="ghost" onClick={onSelect}><Grid3x3 className="size-4" /> Harta</Button>
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
  const medal = ui.save.medals[ui.levelIndex] ?? 1;
  const best = ui.save.bestMoves[ui.levelIndex];
  return (
    <Panel cardClassName="max-w-xl text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-2xl shadow-primary/10">
        <Trophy className="size-8 text-amber-300" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-primary">Nivel complet</p>
      <h2 className="mt-1 font-display text-4xl font-black">{ui.title}</h2>
      <div className="mt-4 flex justify-center"><Stars value={medal} size="lg" /></div>
      <p className="mt-3 text-sm text-muted">
        {ui.moves} mutări · par {ui.par}{best !== null && best !== undefined ? ` · record ${best}` : ""}
      </p>
      {ui.orbsTotal > 0 && <p className="mt-1 text-xs text-violet-200">✦ {ui.orbsCollected}/{ui.orbsTotal} fragmente astrale</p>}
      <p className="mx-auto mt-4 max-w-md text-sm text-muted">
        {last ? "Sanctuarul s-a deschis. Osea și Lois au trecut împreună prin Inima Labirintului." : medal < 3 ? "Poți reveni mai târziu pentru traseul de 3 stele — sau continua aventura acum." : "Traseu perfect. Următorul sigiliu vă așteaptă."}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={onNext}>{last ? "Harta" : "Următorul"}<ChevronRight className="size-5" /></Button>
        <Button size="lg" variant="secondary" onClick={onReplay}>Reia</Button>
        <Button size="lg" variant="ghost" onClick={onSelect}>Harta</Button>
      </div>
    </Panel>
  );
}
