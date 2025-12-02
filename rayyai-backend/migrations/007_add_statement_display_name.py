"""
Migration 007: Add display_name column to statement table
Created: 2025-11-07
Description: Add 'display_name' column for user-friendly statement names while keeping S3 filename for storage

Usage:
    python -m migrations.007_add_statement_display_name
    OR
    cd migrations && python 007_add_statement_display_name.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Add display_name column to statement table"""
    try:
        with engine.connect() as conn:
            # Add display_name column
            conn.execute(text("""
                ALTER TABLE statement
                ADD COLUMN IF NOT EXISTS display_name VARCHAR;
            """))

            # For existing statements, generate basic display names
            # Format: {statement_type}_Statement_{period}
            conn.execute(text("""
                UPDATE statement
                SET display_name =
                    CASE
                        WHEN period_start IS NOT NULL AND period_end IS NOT NULL THEN
                            INITCAP(statement_type) || '_Statement_' ||
                            TO_CHAR(period_start, 'MonYYYY') || '-' || TO_CHAR(period_end, 'MonYYYY')
                        ELSE
                            INITCAP(statement_type) || '_Statement_' || TO_CHAR(date_uploaded, 'DDMONYYYY')
                    END
                WHERE display_name IS NULL;
            """))

            conn.commit()
            print("SUCCESS: Added 'display_name' column to statement table")
            print("  - display_name (VARCHAR): User-friendly name for statements")
            print("  - Generated display names for existing statements")
    except Exception as e:
        print(f"ERROR: Failed to add display_name column: {e}")

if __name__ == "__main__":
    migrate()
