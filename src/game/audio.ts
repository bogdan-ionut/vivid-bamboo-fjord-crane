/** Tiny synth mixer. Unlocks on first gesture. */

export interface AudioApi {
  unlock: () => void;
  move: () => void;
  push: () => void;
  blocked: () => void;
  switchChar: () => void;
  burn: () => void;
  pop: () => void;
  win: () => void;
  plate: () => void;
  setMuted: (v: boolean) => void;
  muted: () => boolean;
}

export function createAudio(): AudioApi {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfx: GainNode | null = null;
  let mute = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.55;
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = mute ? 0 : 0.8;
  }

  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  function beep(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide = 0) {
    if (!ctx || !sfx || mute) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  function noise(dur: number, gain = 0.08) {
    if (!ctx || !sfx || mute) return;
    const t = ctx.currentTime;
    const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = n;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfx);
    src.start(t);
    src.stop(t + dur);
  }

  return {
    unlock,
    move: () => beep(420 + Math.random() * 40, 0.05, "square", 0.05),
    push: () => beep(140, 0.09, "triangle", 0.14, -40),
    blocked: () => beep(90, 0.08, "sawtooth", 0.06),
    switchChar: () => {
      beep(330, 0.07, "sine", 0.08, 80);
      beep(440, 0.09, "sine", 0.06);
    },
    burn: () => {
      noise(0.16, 0.1);
      beep(220, 0.12, "sawtooth", 0.08, 180);
    },
    pop: () => {
      beep(680, 0.1, "sine", 0.1, 240);
      beep(920, 0.08, "triangle", 0.05);
    },
    win: () => {
      beep(523, 0.14, "triangle", 0.1);
      setTimeout(() => beep(659, 0.14, "triangle", 0.1), 110);
      setTimeout(() => beep(784, 0.22, "triangle", 0.12), 220);
    },
    plate: () => beep(510, 0.07, "square", 0.05),
    setMuted: (v) => {
      mute = v;
      if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.8, ctx.currentTime, 0.02);
    },
    muted: () => mute,
  };
}
