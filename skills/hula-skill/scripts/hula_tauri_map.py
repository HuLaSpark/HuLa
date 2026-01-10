#!/usr/bin/env python3
import argparse
import re
import sys
from pathlib import Path


FN_RE = re.compile(r"\bfn\s+([A-Za-z0-9_]+)\b")
INVOKE_STRING_RE = re.compile(r"\b(?:invoke|invokeWithErrorHandler)\s*\(\s*(['\"])([^'\"]+)\1")
INVOKE_ENUM_RE = re.compile(r"\b(?:invoke|invokeWithErrorHandler)\s*\(\s*TauriCommand\.([A-Za-z0-9_]+)")


def find_repo_root(start: Path) -> Path | None:
    for path in [start] + list(start.parents):
        if (path / "package.json").exists() and (path / "src").exists():
            return path
    return None


def scan_rust_commands(root: Path) -> list[tuple[str, Path, int]]:
    src_dir = root / "src-tauri" / "src"
    if not src_dir.exists():
        return []
    results: list[tuple[str, Path, int]] = []
    for rust_file in src_dir.rglob("*.rs"):
        lines = rust_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        idx = 0
        while idx < len(lines):
            if "#[tauri::command]" in lines[idx]:
                seek = idx + 1
                while seek < len(lines):
                    match = FN_RE.search(lines[seek])
                    if match:
                        results.append((match.group(1), rust_file, seek + 1))
                        break
                    seek += 1
                idx = seek
            idx += 1
    return results


def scan_invoke_usage(root: Path) -> tuple[list[tuple[str, Path, int]], list[tuple[str, Path, int]]]:
    src_dir = root / "src"
    if not src_dir.exists():
        return ([], [])
    string_hits: list[tuple[str, Path, int]] = []
    enum_hits: list[tuple[str, Path, int]] = []
    for src_file in src_dir.rglob("*"):
        if not src_file.is_file():
            continue
        if src_file.suffix not in {".ts", ".vue"}:
            continue
        lines = src_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        for line_idx, line in enumerate(lines, start=1):
            for match in INVOKE_STRING_RE.finditer(line):
                string_hits.append((match.group(2), src_file, line_idx))
            for match in INVOKE_ENUM_RE.finditer(line):
                enum_hits.append((match.group(1), src_file, line_idx))
    return (string_hits, enum_hits)


def print_hits(title: str, hits: list[tuple[str, Path, int]], root: Path, detail: bool) -> None:
    unique = sorted({name for name, _, _ in hits})
    print(f"{title}: {len(unique)}")
    if detail:
        for name, path, line in hits:
            print(f"{name}\t{path.relative_to(root)}:{line}")
    else:
        for name in unique:
            print(name)


def main() -> int:
    parser = argparse.ArgumentParser(description="List Tauri commands and frontend invoke usage.")
    parser.add_argument("--root", help="Repo root (defaults to auto-detect).")
    parser.add_argument("--rust", action="store_true", help="List Rust #[tauri::command] functions.")
    parser.add_argument("--invoke", action="store_true", help="List frontend invoke usage.")
    parser.add_argument("--detail", action="store_true", help="Include file and line details.")
    args = parser.parse_args()

    root = Path(args.root).resolve() if args.root else find_repo_root(Path(__file__).resolve())
    if not root:
        print("ERROR: Could not locate repo root (missing package.json).", file=sys.stderr)
        return 1

    if not (args.rust or args.invoke):
        args.rust = True
        args.invoke = True

    if args.rust:
        rust_hits = scan_rust_commands(root)
        print_hits("Rust commands", rust_hits, root, args.detail)

    if args.invoke:
        string_hits, enum_hits = scan_invoke_usage(root)
        print_hits("Invoke string commands", string_hits, root, args.detail)
        print_hits("Invoke enum commands", enum_hits, root, args.detail)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
