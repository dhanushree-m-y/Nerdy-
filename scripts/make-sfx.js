/**
 * Generates NUMI's sound set as small WAV files (no third-party audio, no licensing).
 * Everything is synthesised from soft sine/triangle partials with gentle envelopes,
 * tuned to be calm for 6–11 year olds rather than arcade-loud.
 *
 *   node scripts/make-sfx.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sfx');

const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
const N = { C4: 60, E4: 64, G4: 67, A4: 69, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, C6: 84, E6: 88, G6: 91 };

/** Soft mallet/bell voice: a few partials with a quick attack and exponential decay. */
function voice(freq, dur, { partials = [1, 0.32, 0.12], decay = 6, attack = 0.006, detune = 0, wobble = 0 } = {}) {
  const len = Math.floor(RATE * dur);
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const env = (t < attack ? t / attack : Math.exp(-decay * (t - attack)));
    let s = 0;
    partials.forEach((amp, k) => {
      const f = freq * (k + 1) + detune * k;
      const vib = wobble ? Math.sin(2 * Math.PI * 5 * t) * wobble : 0;
      s += amp * Math.sin(2 * Math.PI * (f + vib) * t);
    });
    buf[i] = s * env;
  }
  return buf;
}

function mix(...layers) {
  const len = Math.max(...layers.map(l => l.buf.length + Math.floor(l.at * RATE)));
  const out = new Float32Array(len);
  for (const { buf, at, gain = 1 } of layers) {
    const off = Math.floor(at * RATE);
    for (let i = 0; i < buf.length; i++) out[off + i] += buf[i] * gain;
  }
  return out;
}

/** A couple of quiet delay taps give the tone a little air without a reverb library. */
function air(buf, { taps = [[0.055, 0.18], [0.11, 0.09]] } = {}) {
  const extra = Math.floor(RATE * 0.3);
  const out = new Float32Array(buf.length + extra);
  out.set(buf);
  for (const [time, gain] of taps) {
    const off = Math.floor(time * RATE);
    for (let i = 0; i < buf.length; i++) out[i + off] += buf[i] * gain;
  }
  return out;
}

function normalise(buf, peak = 0.7) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (!max) return buf;
  const k = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

/** Fade the tail so nothing clicks at the end. */
function fadeOut(buf, seconds = 0.04) {
  const n = Math.floor(RATE * seconds);
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n;
  return buf;
}

function writeWav(name, float) {
  const data = Buffer.alloc(float.length * 2);
  for (let i = 0; i < float.length; i++) {
    const s = Math.max(-1, Math.min(1, float[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);          // PCM
  header.writeUInt16LE(1, 22);          // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, data]));
  console.log('•', name, ((44 + data.length) / 1024).toFixed(0) + ' KB');
}

// ─── The set ──────────────────────────────────────────────────────────────────
const sounds = {
  // a light wooden tick for any tap
  'tap.wav': () => fadeOut(normalise(air(voice(note(N.A5), 0.1, { partials: [1, 0.25], decay: 26 })), 0.45)),

  // a piece landing where it belongs
  'place.wav': () => fadeOut(normalise(air(mix(
    { buf: voice(note(N.G4), 0.16, { partials: [1, 0.4, 0.2], decay: 20 }), at: 0 },
    { buf: voice(note(N.C5), 0.14, { partials: [0.7, 0.2], decay: 22 }), at: 0.012 },
  )), 0.6)),

  // gentle "yes, that fits"
  'correct.wav': () => fadeOut(normalise(air(mix(
    { buf: voice(note(N.E5), 0.3, { decay: 9 }), at: 0 },
    { buf: voice(note(N.G5), 0.36, { decay: 8 }), at: 0.1 },
  )), 0.62)),

  // "not quite" — soft and low, never a buzzer
  'nudge.wav': () => fadeOut(normalise(air(mix(
    { buf: voice(note(N.E4), 0.2, { partials: [1, 0.18], decay: 14 }), at: 0 },
    { buf: voice(note(N.C4), 0.24, { partials: [0.8, 0.12], decay: 12 }), at: 0.05 },
  )), 0.42)),

  // mission complete: a warm little arpeggio
  'reward.wav': () => fadeOut(normalise(air(mix(
    { buf: voice(note(N.C5), 0.5, { decay: 6 }), at: 0 },
    { buf: voice(note(N.E5), 0.5, { decay: 6 }), at: 0.11 },
    { buf: voice(note(N.G5), 0.55, { decay: 5.5 }), at: 0.22 },
    { buf: voice(note(N.C6), 0.8, { decay: 4, partials: [1, 0.3, 0.14, 0.06] }), at: 0.34 },
  )), 0.72)),

  // a power or strategy unlocking: sparkly bell pair
  'chime.wav': () => fadeOut(normalise(air(mix(
    { buf: voice(note(N.G5), 0.6, { partials: [1, 0.5, 0.25, 0.1], decay: 5 }), at: 0 },
    { buf: voice(note(N.C6), 0.7, { partials: [1, 0.45, 0.2], decay: 4.5 }), at: 0.09 },
    { buf: voice(note(N.E6), 0.8, { partials: [0.8, 0.3], decay: 4 }), at: 0.18 },
  )), 0.66)),

  // levelling up a maths power
  'levelup.wav': () => fadeOut(normalise(air(mix(
    { buf: voice(note(N.C5), 0.4, { decay: 7 }), at: 0 },
    { buf: voice(note(N.D5), 0.4, { decay: 7 }), at: 0.09 },
    { buf: voice(note(N.F5), 0.45, { decay: 6 }), at: 0.18 },
    { buf: voice(note(N.A5), 0.6, { decay: 5 }), at: 0.27 },
    { buf: voice(note(N.C6), 0.9, { partials: [1, 0.4, 0.2, 0.08], decay: 3.6 }), at: 0.36 },
  )), 0.74)),

  // opening a sheet / panel
  'whoosh.wav': () => {
    const len = Math.floor(RATE * 0.28);
    const buf = new Float32Array(len);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      const env = Math.sin(Math.PI * (t / 0.28)) ** 2;
      // gently filtered noise reads as air, not static
      const n = (Math.random() * 2 - 1);
      last = last * 0.92 + n * 0.08;
      buf[i] = last * env * 0.5;
    }
    return fadeOut(normalise(buf, 0.3));
  },

  // very quiet meadow pad for the world map (loops)
  'ambience.wav': () => {
    const dur = 8;
    const len = Math.floor(RATE * dur);
    const buf = new Float32Array(len);
    const chord = [note(N.C4), note(N.G4), note(N.E5)];
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      let s = 0;
      chord.forEach((f, k) => {
        const lfo = 1 + 0.0015 * Math.sin(2 * Math.PI * (0.05 + k * 0.03) * t);
        s += Math.sin(2 * Math.PI * f * lfo * t) * (0.5 / (k + 1.6));
      });
      // breathe in and out, and cross-fade the loop seam
      const breath = 0.55 + 0.45 * Math.sin(2 * Math.PI * (t / dur));
      const seam = Math.min(1, Math.min(t, dur - t) / 0.5);
      buf[i] = s * breath * seam;
    }
    return normalise(buf, 0.25);
  },
};

for (const [name, make] of Object.entries(sounds)) writeWav(name, make());
console.log('\nWrote', Object.keys(sounds).length, 'sounds to assets/sfx');
