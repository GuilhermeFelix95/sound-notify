import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideSound, readTranscriptTail } from "./detect.mjs";
import { playSound } from "./player.mjs";

const DEFAULT_SOUNDS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "sounds");

/**
 * Handles a Claude Code Stop hook. Reads the hook input from `stdinText`,
 * picks the sound and plays it. Resolves to the chosen sound name.
 */
export async function handleStop(
  stdinText,
  {
    soundsDir = DEFAULT_SOUNDS_DIR,
    platform = process.platform,
    play = (file) => playSound(file, { platform }),
    readTail = readTranscriptTail,
  } = {},
) {
  const input = JSON.parse(stdinText);
  const transcriptText = input.transcript_path ? await readTail(input.transcript_path) : "";
  const sound = decideSound({
    permissionMode: input.permission_mode,
    transcriptText,
    lastMessage: input.last_assistant_message,
  });

  await play(path.join(soundsDir, `${sound}.wav`));
  return sound;
}
