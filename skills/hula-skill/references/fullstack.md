# Fullstack Flow Guide

## Add or Update a Tauri Command End-to-End

1. Implement a `#[tauri::command]` in Rust and register it in `src-tauri/src/lib.rs`.
2. Add or update the enum entry in `src/enums/index.ts` (`TauriCommand`) when a named constant is preferred.
3. Add a typed wrapper in `src/services/tauriCommand.ts` or call `invoke` directly in a hook/service.
4. Use `invokeWithErrorHandler` in `src/utils/TauriInvokeHandler.ts` when you need standardized error handling.
5. Update any related types in `src/services/types` or local module types.

## Typical Touch Points

- Rust: `src-tauri/src/command/`, `src-tauri/src/lib.rs`
- Frontend enums: `src/enums/index.ts`
- Frontend wrappers: `src/services/tauriCommand.ts`
- Invoke helpers: `src/utils/TauriInvokeHandler.ts`
