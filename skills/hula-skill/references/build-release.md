# Build and Release Guide

## Common Commands

- Install deps: `pnpm install`
- Desktop dev: `pnpm tauri:dev`
- Desktop build: `pnpm tauri:build`
- Lint/format check: `pnpm check`
- Auto-fix: `pnpm check:write`
- Vue formatting: `pnpm format:vue` or `pnpm format:all`
- Tests: `pnpm test:run`
- Commit helper: `pnpm commit`

## Notes

- Use the registry configured in `.npmrc`. Override locally only if needed.
- Avoid committing secrets; use `.env.local` for personal tokens.
