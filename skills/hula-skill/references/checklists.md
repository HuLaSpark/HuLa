# Checklists

## Frontend Changes

- Confirm platform (desktop/mobile) and target window/view.
- Reuse existing view/component patterns from nearby files.
- Update routes in `src/router/index.ts` when adding a new view.
- Add i18n keys under `locales/` when new user-facing strings appear.
- Use UnoCSS utilities and shared tokens from `src/styles/scss/global/variable.scss`.

## Backend Changes

- Add `#[tauri::command]` and register it in `src-tauri/src/lib.rs`.
- Export new command modules in `src-tauri/src/command/mod.rs` if added.
- Update SeaORM entities and migrations when schema changes.

## Fullstack Changes

- Add a `TauriCommand` enum entry if the frontend uses a named constant.
- Add or update a frontend wrapper in `src/services/tauriCommand.ts`.
- Use `invokeWithErrorHandler` for consistent error handling where needed.
- Validate payload and response types end-to-end.

## Build/Release Work

- Use the existing `pnpm` scripts for checks and builds.
- Avoid touching `.rules` unless explicitly asked.
