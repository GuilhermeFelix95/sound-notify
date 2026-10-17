import { test } from "node:test";
import assert from "node:assert/strict";
import { decideSound } from "../src/detect.mjs";
import { loadConfig } from "../src/config.mjs";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const line = (obj) => JSON.stringify(obj);
const prompt = { type: "user", message: { role: "user", content: [{ type: "text", text: "faça X" }] } };
const toolResult = { type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } };
const text = (t) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: t }] } });
const tool = (name) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name, input: {} }] } });
const transcript = (...entries) => entries.map(line).join("\n");

test("always mode plays done for a plain answer", () => {
  const t = transcript(prompt, text("Pronto."));
  assert.equal(decideSound({ permissionMode: "default", transcriptText: t, mode: "always" }), "done");
});

test("code-changes mode plays done when this turn edited a file", () => {
  const t = transcript(prompt, tool("Edit"), toolResult, text("Arquivo alterado."));
  assert.equal(decideSound({ permissionMode: "default", transcriptText: t, mode: "code-changes" }), "done");
});

test("code-changes mode is silent when this turn only read or answered", () => {
  const t = transcript(prompt, tool("Read"), toolResult, text("Explicação."));
  assert.equal(decideSound({ permissionMode: "default", transcriptText: t, mode: "code-changes" }), null);
});

test("code-changes mode ignores edits from a previous turn", () => {
  const t = transcript(prompt, tool("Write"), toolResult, text("Feito."), prompt, text("Só uma dúvida."));
  assert.equal(decideSound({ permissionMode: "default", transcriptText: t, mode: "code-changes" }), null);
});

test("plan mode always plays, even without code changes, in code-changes mode", () => {
  const t = transcript(prompt, tool("Read"), toolResult, text("Plano pronto."));
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t, mode: "code-changes" }), "done");
});

test("plan mode still plays question in code-changes mode", () => {
  const t = transcript(prompt, text("Qual cor?"));
  assert.equal(
    decideSound({ permissionMode: "plan", transcriptText: t, lastMessage: "Qual cor?", mode: "code-changes" }),
    "question",
  );
});

test("loadConfig defaults to always when the file is missing", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sn-"));
  assert.deepEqual(loadConfig(path.join(dir, "nope.json")), { mode: "always" });
});

test("loadConfig reads a valid mode", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sn-"));
  const file = path.join(dir, "c.json");
  writeFileSync(file, JSON.stringify({ mode: "code-changes" }));
  assert.deepEqual(loadConfig(file), { mode: "code-changes" });
});

test("loadConfig falls back to always on invalid JSON or unknown mode", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sn-"));
  const bad = path.join(dir, "bad.json");
  writeFileSync(bad, "{nope");
  assert.deepEqual(loadConfig(bad), { mode: "always" });
  const unknown = path.join(dir, "unknown.json");
  writeFileSync(unknown, JSON.stringify({ mode: "loud" }));
  assert.deepEqual(loadConfig(unknown), { mode: "always" });
});
