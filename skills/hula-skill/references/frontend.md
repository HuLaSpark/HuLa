# Frontend Guide

## Default Stack

- Vue 3 Composition API with `<script setup>`
- Vite 7 + TypeScript
- Pinia for global state
- UnoCSS for utility styling
- Naive UI on desktop, Vant on mobile
- vue-i18n for translations

## File Placement

- Desktop views: `src/views/`
- Mobile views: `src/mobile/views/`
- Shared components: `src/components/`
- Mobile components: `src/mobile/components/`
- Layouts: `src/layout/` and `src/mobile/layout/`
- Routes: `src/router/index.ts`
- Stores: `src/stores/`
- Services/hooks/utils: `src/services/`, `src/hooks/`, `src/utils/`

## Pinia Patterns

- Use setup-style stores: `defineStore(StoresEnum.X, () => { ... })`.
- Keep imperative logic inside store actions.
- Use `storeToRefs` when destructuring state in components.
- Enable persistence per-store with `persist: true` only when needed.

## Styling

- Prefer UnoCSS utilities for simple styling.
- Use `src/styles/scss/global/variable.scss` for shared tokens.
- Consume tokens via `bg-[--token]`, `text-[--token]`, `border-[--token]`.

## Routing and Views

- Add new routes in `src/router/index.ts`.
- Use `@/` for `src/` imports and `#/` for `src/mobile/`.

## i18n

- Add new strings under `locales/` and reference via `t(...)`.
