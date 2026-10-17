import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { handleStop } from "../src/handle-stop.mjs";

const soundsDir = path.resolve("sounds");

const deps = (overrides = {}) => {
  const played = [];
  return {
    played,
    options: {
      soundsDir,
      platform: "linux",
      readTail: async () => "",
      readConfig: () => ({ mode: "always" }),
      play: async (file) => {
        played.push(file);
        return true;
      },
      ...overrides,
    },
  };
};

test("plays done.wav when the hook input has no transcript", async () => {
  const { played, options } = deps();
  const sound = await handleStop(JSON.stringify({ hook_event_name: "Stop" }), options);
  assert.equal(sound, "done");
  assert.deepEqual(played, [path.join(soundsDir, "done.wav")]);
});

test("plays question.wav in plan mode when the transcript ends with a question", async () => {
  const transcript = JSON.stringify({
    type: "assistant",
    message: { role: "assistant", content: [{ type: "text", text: "Posso aplicar?" }] },
  });
  const { played, options } = deps({ readTail: async () => transcript });
  const input = JSON.stringify({
    hook_event_name: "Stop",
    permission_mode: "plan",
    transcript_path: "/t.jsonl",
  });

  const sound = await handleStop(input, options);

  assert.equal(sound, "question");
  assert.deepEqual(played, [path.join(soundsDir, "question.wav")]);
});

test("reads the transcript path from the hook input", async () => {
  let readPath;
  const { options } = deps({
    readTail: async (p) => {
      readPath = p;
      return "";
    },
  });
  await handleStop(JSON.stringify({ transcript_path: "/x/y.jsonl", permission_mode: "plan" }), options);
  assert.equal(readPath, "/x/y.jsonl");
});

test("rejects input that is not valid JSON", async () => {
  const { options } = deps();
  await assert.rejects(handleStop("not json", options), SyntaxError);
});

test("plays nothing when the configured mode says this turn is silent", async () => {
  const transcript = JSON.stringify({
    type: "assistant",
    message: { role: "assistant", content: [{ type: "text", text: "Explicação." }] },
  });
  const { played, options } = deps({ readTail: async () => transcript, readConfig: () => ({ mode: "code-changes" }) });
  const sound = await handleStop(JSON.stringify({ permission_mode: "default", transcript_path: "/t" }), options);
  assert.equal(sound, null);
  assert.deepEqual(played, []);
});
