# HuLa Overview

## Stack

- Tauri v2 + Rust
- Vue 3 (Composition API) + Vite 7 + TypeScript
- Pinia + pinia-plugin-persistedstate + pinia-shared-state
- UnoCSS + Sass
- Naive UI (desktop), Vant (mobile)
- SeaORM + SQLite (SQLCipher)
- vue-i18n

## Repo Layout

- `src/` frontend source
  - `views/`, `components/`, `layout/`, `services/`, `stores/`, `hooks/`, `router/`, `utils/`
  - `mobile/` for mobile views/components/layout
- `src-tauri/` Rust backend
  - `src/` application logic, commands, desktop/mobile modules
  - `entity/` SeaORM entities
  - `migration/` SeaORM migrations
- `tauri-plugin-hula/` local Tauri plugin

## Aliases

- `@/` -> `src/`
- `#/` -> `src/mobile/`
- `~/` -> repo root

## Conventions

- Use 2-space indent and LF line endings.
- Prefer `<script setup>` and the Composition API.
- Prefer UnoCSS utilities; use `src/styles/scss/global/variable.scss` for shared tokens.
- Use `storeToRefs` when destructuring Pinia state.
- Do not change `.rules` unless asked.
- Do not add secrets to tracked files; use `.env.local`.

## Common Files

- Router: `src/router/index.ts`
- Tauri command enum: `src/enums/index.ts` (`TauriCommand`)
- Frontend command wrappers: `src/services/tauriCommand.ts`
- Tauri invoke helpers: `src/utils/TauriInvokeHandler.ts`
- Theme tokens: `src/styles/scss/global/variable.scss`
