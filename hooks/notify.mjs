#!/usr/bin/env node
// Entry point for the Stop hook. Plays a sound and always exits with 0,
// so a sound problem never blocks or breaks Claude Code.
import { handleStop } from "../src/handle-stop.mjs";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

try {
  await handleStop(Buffer.concat(chunks).toString("utf8"));
} catch (error) {
  process.stderr.write(`sound-notify: could not play a sound (${error.message})\n`);
}
