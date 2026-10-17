import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const MODES = ["always", "code-changes"];

export const DEFAULT_CONFIG_PATH = path.join(os.homedir(), ".claude", "sound-notify.json");

/**
 * Reads the user's settings. Missing or invalid files fall back to the defaults,
 * so a bad config never stops the sounds from working.
 *
 *   always        plays after every response
 *   code-changes  plays only after a turn that edited files (plan mode always plays)
 */
export function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8"));
    if (MODES.includes(parsed?.mode)) return { mode: parsed.mode };
  } catch {
    // Missing or invalid file: use the default below.
  }
  return { mode: "always" };
}
