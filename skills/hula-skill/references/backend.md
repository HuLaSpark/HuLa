# Backend Guide (Tauri + Rust)

## Command Locations

- Shared commands: `src-tauri/src/command/`
- Desktop-specific: `src-tauri/src/desktops/`
- Mobile-specific: `src-tauri/src/mobiles/`

## Add a New Command

1. Define a `#[tauri::command]` function in an existing module or a new module.
2. If you add a new module, export it from `src-tauri/src/command/mod.rs`.
3. Register the command in `tauri::generate_handler![...]` inside `src-tauri/src/lib.rs`.
4. Keep signatures async when IO or DB is involved.

## Database

- Use SeaORM entities in `src-tauri/entity/`.
- Add schema changes via migrations in `src-tauri/migration/`.

## Shared State

- Access shared state via `tauri::State<'_, AppData>`.
- Keep long operations async to avoid blocking the runtime.
