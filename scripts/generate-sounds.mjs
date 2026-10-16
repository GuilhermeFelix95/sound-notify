// Generates the bundled WAV files from code, so the plugin ships no third-party audio.
// Run with: npm run sounds
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "sounds");

// "done": quick rising C5-E5-G5 arpeggio, bright and final.
const doneNotes = [
  { freq: 523.25, start: 0.0, duration: 0.22 },
  { freq: 659.25, start: 0.11, duration: 0.22 },
  { freq: 783.99, start: 0.22, duration: 0.42 },
];
const done = (t) => notesAt(doneNotes, t);

// "question": a single rising glide (440 Hz to 880 Hz), open and inviting.
const questionDuration = 0.4;
const question = (t) => glide(t, 440, 880, questionDuration);

function notesAt(notes, t) {
  let sample = 0;
  for (const { freq, start, duration } of notes) {
    const local = t - start;
    if (local < 0 || local > duration) continue;
    sample += sine(freq, local) * envelope(local, duration);
  }
  return sample / 2;
}

function glide(t, fromFreq, toFreq, duration) {
  if (t < 0 || t > duration) return 0;
  // Phase is the integral of a linearly rising frequency.
  const k = (toFreq - fromFreq) / duration;
  const phase = 2 * Math.PI * (fromFreq * t + (k * t * t) / 2);
  return Math.sin(phase) * envelope(t, duration) * 0.8;
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

// Soft attack, exponential decay: avoids clicks at start and end.
function envelope(t, duration) {
  const attack = Math.min(1, t / 0.01);
  const decay = Math.exp((-4 * t) / duration);
  return attack * decay * 0.5;
}

function render(sampleFn, duration) {
  const count = Math.round(SAMPLE_RATE * duration);
  const samples = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    const value = Math.max(-1, Math.min(1, sampleFn(i / SAMPLE_RATE)));
    samples[i] = Math.round(value * 0.6 * 32767);
  }
  return samples;
}

function toWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(samples[i], 44 + i * 2);
  return buffer;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, "done.wav"), toWav(render(done, 0.7)));
writeFileSync(path.join(OUT_DIR, "question.wav"), toWav(render(question, questionDuration)));
console.log(`Wrote sounds to ${OUT_DIR}`);
