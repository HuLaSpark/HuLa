#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path


def find_repo_root(start: Path) -> Path | None:
    for path in [start] + list(start.parents):
        if (path / "package.json").exists() and (path / "src").exists():
            return path
    return None


def list_views(root: Path) -> list[Path]:
    view_paths = []
    desktop = root / "src" / "views"
    mobile = root / "src" / "mobile" / "views"
    if desktop.exists():
        view_paths.extend(desktop.rglob("*.vue"))
    if mobile.exists():
        view_paths.extend(mobile.rglob("*.vue"))
    return sorted(view_paths, key=lambda path: str(path))


def list_stores(root: Path) -> list[Path]:
    stores_dir = root / "src" / "stores"
    if not stores_dir.exists():
        return []
    return sorted(stores_dir.glob("*.ts"), key=lambda path: str(path))


def print_paths(paths: list[Path], root: Path) -> None:
    for path in paths:
        print(path.relative_to(root))


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize HuLa frontend layout.")
    parser.add_argument("--root", help="Repo root (defaults to auto-detect).")
    parser.add_argument("--views", action="store_true", help="List view files.")
    parser.add_argument("--stores", action="store_true", help="List store files.")
    parser.add_argument("--summary", action="store_true", help="Print counts summary.")
    args = parser.parse_args()

    root = Path(args.root).resolve() if args.root else find_repo_root(Path(__file__).resolve())
    if not root:
        print("ERROR: Could not locate repo root (missing package.json).", file=sys.stderr)
        return 1

    if not (args.views or args.stores or args.summary):
        args.summary = True

    views = list_views(root)
    stores = list_stores(root)

    if args.summary:
        print(f"Repo: {root}")
        print(f"Views: {len(views)}")
        print(f"Stores: {len(stores)}")

    if args.views:
        print("View files:")
        print_paths(views, root)

    if args.stores:
        print("Store files:")
        print_paths(stores, root)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
