#!/usr/bin/env python3
"""
init_db.py — LA28 Schedule Planner database initializer.

Run this on the Raspberry Pi before starting the server.
It will:
  1. Confirm the database file exists (requires import_schedule.py to have run first).
  2. Check which of the three application tables already exist.
  3. Create any missing tables.
  4. Print a clear status report so you know exactly what happened.

Usage:
    python3 init_db.py [--db PATH]

The default database path is la28.db in the same directory as this script.
"""

import argparse
import sqlite3
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Table definitions — kept in dependency order (users → plans → plan_events)
# ---------------------------------------------------------------------------
APP_TABLES = {
    "users": """
        CREATE TABLE users (
            id            INTEGER  PRIMARY KEY AUTOINCREMENT,
            username      TEXT     UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT     NOT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """,

    "plans": """
        CREATE TABLE plans (
            id         INTEGER  PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER  NOT NULL,
            name       TEXT     NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """,

    "plan_events": """
        CREATE TABLE plan_events (
            id       INTEGER  PRIMARY KEY AUTOINCREMENT,
            plan_id  INTEGER  NOT NULL,
            event_id INTEGER  NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(plan_id, event_id),
            FOREIGN KEY (plan_id)  REFERENCES plans(id)               ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES competition_schedule(id)
        )
    """,
}

# The schedule table must exist before app tables can reference it.
REQUIRED_SOURCE_TABLE = "competition_schedule"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_existing_tables(conn: sqlite3.Connection) -> set[str]:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cur.fetchall()}


def get_row_count(conn: sqlite3.Connection, table: str) -> int:
    cur = conn.execute(f"SELECT COUNT(*) FROM {table}")
    return cur.fetchone()[0]


def check_mark(ok: bool) -> str:
    return "✓" if ok else "✗"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Initialize la28.db application tables.")
    parser.add_argument(
        "--db",
        default=Path(__file__).parent / "la28.db",
        type=Path,
        help="Path to la28.db (default: ./la28.db)",
    )
    args = parser.parse_args()
    db_path: Path = args.db.resolve()

    print("=" * 60)
    print("  LA28 Schedule Planner — Database Initializer")
    print("=" * 60)
    print(f"\nDatabase path: {db_path}\n")

    # ------------------------------------------------------------------
    # 1. Check that the file exists
    # ------------------------------------------------------------------
    if not db_path.exists():
        print(f"[✗] Database file not found: {db_path}")
        print()
        print("    Run import_schedule.py first to create the database and")
        print("    populate the competition_schedule table, then run this")
        print("    script again.")
        return 1

    file_size_kb = db_path.stat().st_size / 1024
    print(f"[✓] Database file found ({file_size_kb:.1f} KB)")

    # ------------------------------------------------------------------
    # 2. Connect and enable foreign-key enforcement
    # ------------------------------------------------------------------
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row

    existing = get_existing_tables(conn)

    # ------------------------------------------------------------------
    # 3. Verify the schedule data exists
    # ------------------------------------------------------------------
    if REQUIRED_SOURCE_TABLE not in existing:
        print(f"\n[✗] Required source table '{REQUIRED_SOURCE_TABLE}' is missing.")
        print("    Run import_schedule.py first to import the PDF schedule data.")
        conn.close()
        return 1

    schedule_rows = get_row_count(conn, REQUIRED_SOURCE_TABLE)
    print(f"[✓] competition_schedule table present ({schedule_rows:,} events)")

    # ------------------------------------------------------------------
    # 4. Create missing application tables
    # ------------------------------------------------------------------
    print()
    print("Checking application tables:")
    print("-" * 40)

    created = []
    already_existed = []

    for table_name, create_sql in APP_TABLES.items():
        if table_name in existing:
            row_count = get_row_count(conn, table_name)
            print(f"  [✓] {table_name:<15} already exists ({row_count:,} rows)")
            already_existed.append(table_name)
        else:
            try:
                conn.execute(create_sql)
                conn.commit()
                print(f"  [+] {table_name:<15} created")
                created.append(table_name)
            except sqlite3.Error as exc:
                print(f"  [✗] {table_name:<15} FAILED: {exc}")
                conn.close()
                return 1

    conn.close()

    # ------------------------------------------------------------------
    # 5. Summary
    # ------------------------------------------------------------------
    print()
    print("=" * 60)
    if not created:
        print("  All tables already exist — nothing to do.")
    else:
        print(f"  Created {len(created)} table(s): {', '.join(created)}")
        if already_existed:
            print(f"  Skipped {len(already_existed)} existing table(s): {', '.join(already_existed)}")
    print()
    print("  Database is ready. You can now start the server:")
    print("    cd server && npm start")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
