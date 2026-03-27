#!/usr/bin/env python3
"""
Reads the LA28 Olympics competition schedule PDF and saves table rows to la28.db (SQLite3).
"""

import re
import sqlite3
import pdfplumber
from datetime import date
from pathlib import Path

PDF_FILE = "LA28OlympicGamesCompetitionScheduleByEventV3.0.pdf"
DB_FILE = "la28.db"

EXPECTED_COLUMNS = ["Sport", "Venue", "Zone", "Session Code", "Date", "Games Day",
                    "Session Type", "Session Description", "Start Time", "End Time"]


def create_tables(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS competition_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sport TEXT,
            venue TEXT,
            zone TEXT,
            session_code TEXT,
            date TEXT,
            games_day TEXT,
            session_type TEXT,
            session_description TEXT,
            start_time TEXT,
            end_time TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schedule_meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    conn.commit()


def strip_newlines(value):
    """Replace any newline characters with a single space and strip whitespace."""
    if value is None:
        return None
    return re.sub(r'[\r\n]+', ' ', value).strip()


def is_data_row(row):
    """Filter out disclaimer/header rows and empty rows."""
    if not row or row[0] is None:
        return False
    if row[0] == "Sport":
        return False
    # Skip the disclaimer row (first row spanning all columns)
    if row[1] is None and row[2] is None:
        return False
    return True


def extract_rows(pdf_path):
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if is_data_row(row):
                        # Pad or trim to exactly 10 columns
                        row = list(row) + [None] * 10
                        row = row[:10]
                        # Clean newlines from sport (col 0), start_time (col 8), end_time (col 9)
                        row[0] = strip_newlines(row[0])
                        row[8] = strip_newlines(row[8])
                        row[9] = strip_newlines(row[9])
                        rows.append(row)
    return rows


def insert_rows(conn, rows):
    conn.executemany("""
        INSERT INTO competition_schedule
            (sport, venue, zone, session_code, date, games_day,
             session_type, session_description, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    conn.commit()


def parse_version(pdf_filename):
    """Extract version string from filename, e.g. 'V3.0' from '...V3.0.pdf'."""
    match = re.search(r'(V[\d.]+)', Path(pdf_filename).stem, re.IGNORECASE)
    return match.group(1) if match else 'Unknown'


def save_meta(conn, pdf_filename):
    version = parse_version(pdf_filename)
    imported_on = date.today().isoformat()
    conn.execute("INSERT OR REPLACE INTO schedule_meta (key, value) VALUES ('version', ?)", (version,))
    conn.execute("INSERT OR REPLACE INTO schedule_meta (key, value) VALUES ('imported_on', ?)", (imported_on,))
    conn.execute("INSERT OR REPLACE INTO schedule_meta (key, value) VALUES ('source_file', ?)", (Path(pdf_filename).name,))
    conn.commit()


def main():
    rows = extract_rows(PDF_FILE)
    print(f"Extracted {len(rows)} rows from {PDF_FILE}")

    conn = sqlite3.connect(DB_FILE)
    create_tables(conn)
    insert_rows(conn, rows)
    save_meta(conn, PDF_FILE)
    conn.close()

    print(f"Saved to {DB_FILE}")


if __name__ == "__main__":
    main()
