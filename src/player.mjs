import { spawn as nodeSpawn } from "node:child_process";

/**
 * Commands that can play a WAV file on each platform, in order of preference.
 * Only the first one that starts is used.
 */
export function playerCandidates(platform, file) {
  switch (platform) {
    case "win32":
      return [
        {
          command: "powershell.exe",
          args: [
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            `(New-Object System.Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`,
          ],
        },
      ];
    case "darwin":
      return [{ command: "afplay", args: [file] }];
    case "linux":
      return [
        { command: "paplay", args: [file] },
        { command: "aplay", args: ["-q", file] },
      ];
    default:
      return [];
  }
}

/**
 * Starts playback without waiting for it to finish, so the hook returns at
 * once. Resolves to false when no player is available; never rejects.
 */
export function playSound(file, { platform = process.platform, spawn = nodeSpawn } = {}) {
  return playerCandidates(platform, file).reduce(
    (previous, candidate) => previous.then((started) => started || startDetached(candidate, spawn)),
    Promise.resolve(false),
  );
}

function startDetached({ command, args }, spawn) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
    } catch {
      resolve(false);
      return;
    }
    child.once("error", () => resolve(false));
    child.once("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}
