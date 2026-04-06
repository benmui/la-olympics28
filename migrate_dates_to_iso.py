#!/usr/bin/env python3
"""
migrate_dates_to_iso.py — Convert competition_schedule.date from
"Monday, July 14" format to ISO "2028-07-14" format.

Run this once against the existing database before deploying the updated server.

Usage:
    python3 migrate_dates_to_iso.py [--db PATH] [--dry-run]

Options:
    --db PATH    Path to la28.db (default: ./la28.db)
    --dry-run    Show what would change without writing to the database
"""

import argparse
import re
import sqlite3
import sys
from pathlib import Path

GAMES_YEAR = 2028
MONTH_MAP = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12,
}

ISO_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def parse_date_to_iso(raw):
    """Convert 'Monday, July 14' or 'July 14' to '2028-07-14'. Returns None if unparseable."""
    if not raw:
        return None
    # Already ISO — skip
    if ISO_PATTERN.match(raw.strip()):
        return raw.strip()
    # Strip weekday prefix: "Monday, July 14" → "July 14"
    clean = re.sub(r'^[A-Za-z]+,\s*', '', raw.strip())
    parts = clean.split()
    if len(parts) >= 2:
        month_name = parts[0].strip(',')
        month = MONTH_MAP.get(month_name)
        try:
            day = int(parts[1].strip(','))
        except ValueError:
            return None
        if month:
            return f"{GAMES_YEAR}-{month:02d}-{day:02d}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate date column to ISO format.")
    parser.add_argument('--db', default=Path(__file__).parent / 'la28.db', type=Path)
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    args = parser.parse_args()
    db_path: Path = args.db.resolve()

    print("=" * 60)
    print("  LA28 — Date Migration: non-ISO → ISO")
    print("=" * 60)
    print(f"\nDatabase: {db_path}")
    if args.dry_run:
        print("Mode:     DRY RUN (no changes will be written)\n")
    else:
        print("Mode:     LIVE (changes will be committed)\n")

    if not db_path.exists():
        print(f"[✗] Database not found: {db_path}")
        return 1

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    rows = conn.execute("SELECT id, date FROM competition_schedule").fetchall()
    print(f"Total rows: {len(rows)}")

    updates = []
    skipped_already_iso = 0
    errors = []

    for row in rows:
        raw = row['date']
        iso = parse_date_to_iso(raw)
        if iso is None:
            errors.append((row['id'], raw))
        elif iso == raw:
            skipped_already_iso += 1
        else:
            updates.append((iso, row['id']))

    print(f"Already ISO format:  {skipped_already_iso}")
    print(f"Will convert:        {len(updates)}")
    print(f"Parse errors:        {len(errors)}")

    if errors:
        print("\n[!] Rows that could not be parsed:")
        for eid, val in errors[:10]:
            print(f"    id={eid}  date={val!r}")
        if len(errors) > 10:
            print(f"    ... and {len(errors) - 10} more")

    if not updates:
        print("\nNothing to update — database is already up to date.")
        conn.close()
        return 0

    if args.dry_run:
        print("\nSample conversions (first 5):")
        sample_ids = {uid for _, uid in updates[:5]}
        for row in rows:
            if row['id'] in sample_ids:
                iso = parse_date_to_iso(row['date'])
                print(f"  id={row['id']:4d}  {row['date']!r:35s} → {iso!r}")
        print("\nDry run complete. No changes written.")
        conn.close()
        return 0

    # Write changes
    conn.executemany("UPDATE competition_schedule SET date = ? WHERE id = ?", updates)
    conn.commit()
    conn.close()

    print(f"\n[✓] Updated {len(updates)} rows successfully.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
