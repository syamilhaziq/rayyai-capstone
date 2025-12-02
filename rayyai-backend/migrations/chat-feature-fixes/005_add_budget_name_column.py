"""
Migration 005: Add name column to budget table
Created: 2025-11-07
Description: Add missing 'name' column to budget table to store budget names

Usage:
    python -m migrations.005_add_budget_name_column
    OR
    cd migrations && python 005_add_budget_name_column.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Add name column to budget table"""
    try:
        with engine.connect() as conn:
            # Add name column with IF NOT EXISTS and default value
            conn.execute(text("""
                ALTER TABLE budget
                ADD COLUMN IF NOT EXISTS name VARCHAR NOT NULL DEFAULT 'Unnamed Budget';
            """))

            # Update existing budgets to have a descriptive name based on category
            conn.execute(text("""
                UPDATE budget
                SET name = category || ' Budget'
                WHERE name = 'Unnamed Budget';
            """))

            conn.commit()
            print("SUCCESS: Added 'name' column to budget table")
            print("  - name (VARCHAR): Budget name/description")
            print("  - Updated existing budgets with default names based on category")
    except Exception as e:
        print(f"ERROR: Failed to add name column: {e}")

if __name__ == "__main__":
    migrate()
