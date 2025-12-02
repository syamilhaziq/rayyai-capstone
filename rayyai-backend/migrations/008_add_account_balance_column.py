"""
Migration 008: Add account_balance column to account table
Created: 2025-11-10
Description: Add missing 'account_balance' column to account table

Usage:
    python -m migrations.008_add_account_balance_column
    OR
    cd migrations && python 008_add_account_balance_column.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Add account_balance column to account table"""
    try:
        with engine.connect() as conn:
            # Add account_balance column with IF NOT EXISTS
            conn.execute(text("""
                ALTER TABLE account
                ADD COLUMN IF NOT EXISTS account_balance FLOAT;
            """))

            conn.commit()
            print("SUCCESS: Added 'account_balance' column to account table")
            print("  - account_balance (FLOAT): Account balance amount")
    except Exception as e:
        print(f"ERROR: Failed to add account_balance column: {e}")

if __name__ == "__main__":
    migrate()
