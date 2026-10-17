import { open } from "node:fs/promises";

// Enough to cover the last assistant message of a long session without
// reading the whole transcript on every turn.
const TAIL_BYTES = 512 * 1024;

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/**
 * Chooses the sound for the end of a turn. Returns "done", "question", or null
 * when the configured mode keeps this turn silent.
 *
 * - Plan mode always plays: "question" when the assistant asks something, otherwise "done".
 * - mode "always" plays "done" after every turn.
 * - mode "code-changes" plays "done" only when this turn edited files.
 *
 * `lastMessage` is the Stop hook's `last_assistant_message`. It is used for the
 * text check when present, because the transcript may not be flushed yet.
 */
export function decideSound({ permissionMode, transcriptText, lastMessage, mode = "always" }) {
  if (permissionMode === "plan") {
    const content = lastAssistantContent(transcriptText) ?? [];
    const text = typeof lastMessage === "string" ? lastMessage : lastTextOf(content);
    return usedQuestionTool(content) || /[?？]\s*$/.test(text.trim()) ? "question" : "done";
  }

  if (mode === "code-changes") return turnEditedFiles(transcriptText) ? "done" : null;
  return "done";
}

/**
 * Reads the end of a JSONL transcript. Returns "" when the file cannot be
 * read, so the caller falls back to the default sound.
 */
export async function readTranscriptTail(transcriptPath, maxBytes = TAIL_BYTES) {
  let handle;
  try {
    handle = await open(transcriptPath, "r");
    const { size } = await handle.stat();
    const length = Math.min(size, maxBytes);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    let text = buffer.toString("utf8");
    // When we cut the file mid-line, the first line is incomplete: drop it.
    if (size > maxBytes) text = text.slice(text.indexOf("\n") + 1);
    return text;
  } catch {
    return "";
  } finally {
    await handle?.close();
  }
}

function lastAssistantContent(transcriptText) {
  const lines = (transcriptText ?? "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = parseLine(lines[i]);
    if (entry?.type === "assistant") return entry.message?.content ?? [];
  }
  return null;
}

// Looks back from the end until the user's last prompt; tool results are not prompts.
function turnEditedFiles(transcriptText) {
  const lines = (transcriptText ?? "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = parseLine(lines[i]);
    if (entry?.type === "user" && isPrompt(entry.message?.content)) return false;
    const content = entry?.type === "assistant" ? entry.message?.content ?? [] : [];
    if (content.some((block) => block.type === "tool_use" && EDIT_TOOLS.has(block.name))) return true;
  }
  return false;
}

function isPrompt(content) {
  if (typeof content === "string") return true;
  return Array.isArray(content) && content.some((block) => block.type === "text");
}

function usedQuestionTool(content) {
  return content.some((block) => block.type === "tool_use" && block.name === "AskUserQuestion");
}

function lastTextOf(content) {
  const texts = content.filter((block) => block.type === "text");
  return texts.length ? texts[texts.length - 1].text ?? "" : "";
}

function parseLine(line) {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}
