/** Tiny procedural synth mixer. Unlocks on first user gesture. */

export interface AudioApi {
  unlock: () => void;
  move: () => void;
  push: () => void;
  blocked: () => void;
  switchChar: () => void;
  burn: () => void;
  pop: () => void;
  orb: () => void;
  key: () => void;
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

  function beep(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide = 0, delay = 0) {
    if (!ctx || !sfx || mute) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
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

  function noise(dur: number, gain = 0.08, frequency = 900) {
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
    f.frequency.value = frequency;
    f.Q.value = 0.8;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfx);
    src.start(t);
    src.stop(t + dur);
  }

  function chord(notes: number[], step = 0.07, gain = 0.07) {
    notes.forEach((n, i) => beep(n, 0.18, "triangle", gain, 0, i * step));
  }

  return {
    unlock,
    move: () => {
      beep(390 + Math.random() * 45, 0.045, "square", 0.035, -20);
      if (Math.random() > 0.65) noise(0.025, 0.018, 1600);
    },
    push: () => {
      beep(145, 0.1, "triangle", 0.13, -45);
      noise(0.055, 0.045, 420);
    },
    blocked: () => beep(92, 0.085, "sawtooth", 0.055, -18),
    switchChar: () => {
      beep(330, 0.075, "sine", 0.07, 100);
      beep(494, 0.1, "sine", 0.05, 60, 0.055);
    },
    burn: () => {
      noise(0.22, 0.11, 1100);
      beep(190, 0.18, "sawtooth", 0.075, 250);
      beep(410, 0.12, "triangle", 0.04, 180, 0.05);
    },
    pop: () => {
      beep(620, 0.11, "sine", 0.09, 330);
      beep(980, 0.09, "triangle", 0.045, 160, 0.055);
      noise(0.07, 0.025, 2200);
    },
    orb: () => {
      chord([659, 784, 1047], 0.045, 0.055);
      beep(1319, 0.22, "sine", 0.035, 120, 0.12);
    },
    key: () => {
      chord([523, 659, 988], 0.06, 0.065);
      beep(1568, 0.28, "sine", 0.04, -180, 0.17);
    },
    win: () => {
      chord([523, 659, 784, 1047], 0.1, 0.09);
      beep(1319, 0.35, "sine", 0.055, 90, 0.32);
    },
    plate: () => {
      beep(440, 0.06, "square", 0.045, 80);
      beep(660, 0.1, "triangle", 0.035, 0, 0.04);
    },
    setMuted: (v) => {
      mute = v;
      if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.8, ctx.currentTime, 0.02);
    },
    muted: () => mute,
  };
}
