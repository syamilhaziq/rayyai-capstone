"""
Migration 004: Add file_hash column to statement table for duplicate file detection
This migration adds SHA-256 hash column to prevent duplicate file uploads

Usage:
    python -m migrations.004_add_file_hash_column
    OR
    cd migrations && python 004_add_file_hash_column.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Add file_hash column to statement table for duplicate detection"""
    try:
        with engine.connect() as conn:
            # Add file_hash column with index for fast duplicate lookups
            conn.execute(text("""
                ALTER TABLE statement
                ADD COLUMN IF NOT EXISTS file_hash VARCHAR
            """))

            # Create index for fast duplicate lookups
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_statement_file_hash
                ON statement(file_hash)
            """))

            conn.commit()
            print("SUCCESS: Added file_hash column to statement table")
            print("  - file_hash (VARCHAR): SHA-256 hash for duplicate detection")
            print("  - idx_statement_file_hash: Index for fast duplicate lookups")
    except Exception as e:
        print(f"ERROR: Failed to add column: {e}")

if __name__ == "__main__":
    migrate()
