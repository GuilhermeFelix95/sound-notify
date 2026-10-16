import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { playerCandidates, playSound } from "../src/player.mjs";

test("Windows uses PowerShell SoundPlayer with a hidden window", () => {
  const [first] = playerCandidates("win32", "C:\\plugin\\sounds\\done.wav");
  assert.equal(first.command, "powershell.exe");
  assert.ok(first.args.includes("-WindowStyle"));
  assert.ok(first.args.includes("Hidden"));
  const script = first.args[first.args.length - 1];
  assert.match(script, /System\.Media\.SoundPlayer/);
  assert.match(script, /'C:\\plugin\\sounds\\done\.wav'/);
});

test("Windows escapes single quotes in the file path", () => {
  const [first] = playerCandidates("win32", "C:\\Users\\O'Brien\\done.wav");
  const script = first.args[first.args.length - 1];
  assert.match(script, /'C:\\Users\\O''Brien\\done\.wav'/);
});

test("macOS uses afplay", () => {
  assert.deepEqual(playerCandidates("darwin", "/p/done.wav"), [
    { command: "afplay", args: ["/p/done.wav"] },
  ]);
});

test("Linux tries paplay, then aplay", () => {
  assert.deepEqual(
    playerCandidates("linux", "/p/done.wav").map((c) => c.command),
    ["paplay", "aplay"],
  );
});

test("unknown platforms have no player", () => {
  assert.deepEqual(playerCandidates("freebsd", "/p/done.wav"), []);
});

test("playSound falls back to the next player when one is missing", async () => {
  const spawned = [];
  const fakeSpawn = (command) => {
    spawned.push(command);
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => {
      if (command === "paplay") child.emit("error", Object.assign(new Error("nope"), { code: "ENOENT" }));
      else child.emit("spawn");
    });
    return child;
  };

  const ok = await playSound("/p/done.wav", { platform: "linux", spawn: fakeSpawn });

  assert.equal(ok, true);
  assert.deepEqual(spawned, ["paplay", "aplay"]);
});

test("playSound returns false when no player can start", async () => {
  const fakeSpawn = () => {
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => child.emit("error", Object.assign(new Error("nope"), { code: "ENOENT" })));
    return child;
  };

  const ok = await playSound("/p/done.wav", { platform: "linux", spawn: fakeSpawn });

  assert.equal(ok, false);
});

test("playSound spawns detached with ignored stdio so the hook never waits", async () => {
  let options;
  const fakeSpawn = (_command, _args, opts) => {
    options = opts;
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => child.emit("spawn"));
    return child;
  };

  await playSound("/p/done.wav", { platform: "darwin", spawn: fakeSpawn });

  assert.equal(options.detached, true);
  assert.equal(options.stdio, "ignore");
  assert.equal(options.windowsHide, true);
});
