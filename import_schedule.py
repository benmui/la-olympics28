#!/usr/bin/env python3
"""
Reads the LA28 Olympics competition schedule PDF and saves table rows to la28.db (SQLite3).
"""

import sqlite3
import pdfplumber

PDF_FILE = "LA28OlympicGamesCompetitionScheduleByEventV3.0.pdf"
DB_FILE = "la28.db"

EXPECTED_COLUMNS = ["Sport", "Venue", "Zone", "Session Code", "Date", "Games Day",
                    "Session Type", "Session Description", "Start Time", "End Time"]


def create_table(conn):
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
    conn.commit()


def is_header_row(row):
    return row and row[0] == "Sport"


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
                        rows.append(row[:10])
    return rows


def insert_rows(conn, rows):
    conn.executemany("""
        INSERT INTO competition_schedule
            (sport, venue, zone, session_code, date, games_day,
             session_type, session_description, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    conn.commit()


def main():
    rows = extract_rows(PDF_FILE)
    print(f"Extracted {len(rows)} rows from {PDF_FILE}")

    conn = sqlite3.connect(DB_FILE)
    create_table(conn)
    insert_rows(conn, rows)
    conn.close()

    print(f"Saved to {DB_FILE}")


if __name__ == "__main__":
    main()
