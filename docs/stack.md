# Stack

## Visão geral

Plugin do Claude Code (`sound-notify`) que toca um som ao fim de cada turno e um som diferente quando o Claude faz uma pergunta em modo plan.

- **Runtime:** Node.js >= 20, sem dependências de terceiros.
- **Testes:** `node --test` (runner nativo).
- **Plataformas:** Windows (PowerShell + `System.Media.SoundPlayer`), macOS (`afplay`), Linux (`paplay` com fallback para `aplay`).

## Estrutura

| Caminho | Função |
| --- | --- |
| `.claude-plugin/plugin.json` | Manifesto do plugin |
| `hooks/hooks.json` | Registra o hook `Stop` |
| `hooks/notify.mjs` | Ponto de entrada do hook (lê stdin, sempre sai com 0) |
| `src/handle-stop.mjs` | Orquestra: lê a entrada do hook, escolhe o som e toca |
| `src/config.mjs` | Lê `~/.claude/sound-notify.json` (modos `always` e `code-changes`) |
| `src/detect.mjs` | Decide `done` ou `question` a partir de `permission_mode`, `last_assistant_message` e do transcript |
| `src/player.mjs` | Escolhe o comando de áudio por plataforma e inicia sem bloquear |
| `scripts/generate-sounds.mjs` | Gera `sounds/done.wav` e `sounds/question.wav` |
| `tests/` | Testes unitários de detecção, player e handler |

## Regras de decisão

1. `permission_mode` = `plan` → sempre toca: `question` se a última mensagem usa `AskUserQuestion` ou termina com `?`, senão `done`.
2. Fora do plan, modo `always` → `done` em toda resposta.
3. Fora do plan, modo `code-changes` → `done` só se o turno atual usou `Edit`, `Write`, `MultiEdit` ou `NotebookEdit`; senão silêncio (`null`).
4. Qualquer falha de áudio ou de leitura é silenciosa para o Claude (log de uma linha no stderr, exit 0).

## Contrato do hook (verificado com Claude Code 2.1.x)

Campos usados do stdin do evento `Stop`: `permission_mode`, `last_assistant_message`, `transcript_path`.

## Convenções

- Código e mensagens de erro em inglês; documentação do projeto em português.
- Mudanças são refletidas aqui e em `MEMORY.md`.
