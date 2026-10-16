# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-16

### Added
- Stop hook that plays `done.wav` when Claude finishes a turn.
- Plan-mode question detection: plays `question.wav` when Claude asks a question while in plan mode (via `AskUserQuestion` or a message ending in `?`).
- Windows (PowerShell), macOS (`afplay`) and Linux (`paplay` / `aplay`) playback.
- Bundled sounds generated from code (`npm run sounds`), so no third-party audio is shipped.
- Unit tests for detection, playback and the hook handler (`npm test`).
