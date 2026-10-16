import { test } from "node:test";
import assert from "node:assert/strict";
import { decideSound } from "../src/detect.mjs";

const line = (obj) => JSON.stringify(obj);

const userEntry = { type: "user", message: { role: "user", content: [{ type: "text", text: "oi" }] } };

const assistantText = (text) => ({
  type: "assistant",
  message: { role: "assistant", content: [{ type: "text", text }] },
});

const assistantAskTool = () => ({
  type: "assistant",
  message: {
    role: "assistant",
    content: [{ type: "tool_use", name: "AskUserQuestion", input: {} }],
  },
});

const transcript = (...entries) => entries.map(line).join("\n");

test("plays 'done' when the turn ends with a plain statement", () => {
  const t = transcript(userEntry, assistantText("Pronto, arquivo salvo."));
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t }), "done");
});

test("plays 'question' in plan mode when the turn ends with '?'", () => {
  const t = transcript(userEntry, assistantText("Qual branch você prefere?"));
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t }), "question");
});

test("ignores trailing whitespace after the '?'", () => {
  const t = transcript(userEntry, assistantText("Posso seguir?   \n"));
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t }), "question");
});

test("plays 'question' in plan mode when AskUserQuestion was used last", () => {
  const t = transcript(userEntry, assistantAskTool());
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t }), "question");
});

test("outside plan mode, a question still plays 'done'", () => {
  const t = transcript(userEntry, assistantText("Quer que eu continue?"));
  assert.equal(decideSound({ permissionMode: "default", transcriptText: t }), "done");
  assert.equal(decideSound({ permissionMode: undefined, transcriptText: t }), "done");
});

test("outside plan mode, AskUserQuestion still plays 'done'", () => {
  const t = transcript(userEntry, assistantAskTool());
  assert.equal(decideSound({ permissionMode: "acceptEdits", transcriptText: t }), "done");
});

test("only the last assistant message counts, not earlier questions", () => {
  const t = transcript(
    userEntry,
    assistantText("Você quer X?"),
    userEntry,
    assistantText("Feito."),
  );
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t }), "done");
});

test("uses last_assistant_message for the text check when it is provided", () => {
  // The transcript may lag behind the Stop hook, so the hook's own text wins.
  const t = transcript(userEntry, assistantText("Feito."));
  assert.equal(
    decideSound({ permissionMode: "plan", transcriptText: t, lastMessage: "Posso seguir?" }),
    "question",
  );
});

test("falls back to 'done' when the transcript is missing or unreadable", () => {
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: "" }), "done");
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: "não é json\n{quebrado" }), "done");
});

test("skips malformed lines and still reads the valid last assistant message", () => {
  const t = [line(userEntry), "linha quebrada {", line(assistantText("Confirma?"))].join("\n");
  assert.equal(decideSound({ permissionMode: "plan", transcriptText: t }), "question");
});
