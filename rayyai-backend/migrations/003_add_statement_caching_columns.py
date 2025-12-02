"""
Migration 003: Add AI extraction caching and processing status to statement table
This migration adds columns to cache Gemini AI extraction results and track processing status

Usage:
    python -m migrations.003_add_statement_caching_columns
    OR
    cd migrations && python 003_add_statement_caching_columns.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Add caching and processing status columns to statement table"""
    try:
        with engine.connect() as conn:
            # Add extracted_data JSON column to cache Gemini results
            conn.execute(text("""
                ALTER TABLE statement
                ADD COLUMN IF NOT EXISTS extracted_data JSON
            """))

            # Add processing_status with default 'pending'
            conn.execute(text("""
                ALTER TABLE statement
                ADD COLUMN IF NOT EXISTS processing_status VARCHAR NOT NULL DEFAULT 'pending'
            """))

            # Add processing_error for error messages
            conn.execute(text("""
                ALTER TABLE statement
                ADD COLUMN IF NOT EXISTS processing_error TEXT
            """))

            # Add last_processed timestamp
            conn.execute(text("""
                ALTER TABLE statement
                ADD COLUMN IF NOT EXISTS last_processed TIMESTAMP
            """))

            # Add constraint for processing_status values
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'check_processing_status'
                    ) THEN
                        ALTER TABLE statement
                        ADD CONSTRAINT check_processing_status
                        CHECK (processing_status IN ('pending', 'extracting', 'extracted', 'imported', 'failed'));
                    END IF;
                END $$;
            """))

            conn.commit()
            print("SUCCESS: Added caching and processing status columns to statement table")
            print("  - extracted_data (JSON): Cache for Gemini extraction results")
            print("  - processing_status (VARCHAR): Track extraction status")
            print("  - processing_error (TEXT): Store error messages")
            print("  - last_processed (TIMESTAMP): Track last extraction attempt")
    except Exception as e:
        print(f"ERROR: Failed to add columns: {e}")

if __name__ == "__main__":
    migrate()
