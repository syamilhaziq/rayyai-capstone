"""
Migration 001: Add account_subtype column to account table
Run this once to update the database schema

Usage:
    python -m migrations.001_add_account_subtype
    OR
    cd migrations && python 001_add_account_subtype.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Add account_subtype column to account table"""
    try:
        with engine.connect() as conn:
            # Add the column if it doesn't exist
            conn.execute(text("""
                ALTER TABLE account
                ADD COLUMN IF NOT EXISTS account_subtype VARCHAR
            """))
            conn.commit()
            print("SUCCESS: Added account_subtype column to account table")
    except Exception as e:
        print(f"ERROR: Failed to add column: {e}")

if __name__ == "__main__":
    migrate()
