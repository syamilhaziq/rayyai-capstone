"""
Migration 002: Fix existing account_type values to match the new enum
Run this once to update existing account data

This migration renames old account type values:
- 'debit' -> 'savings'
- 'wallet' -> 'ewallet'
- 'credit_card' -> 'credit'
- 'checking' -> 'current'

Usage:
    python -m migrations.002_fix_account_types
    OR
    cd migrations && python 002_fix_account_types.py
"""
import sys
from pathlib import Path

# Add parent directory to path to import database module
sys.path.append(str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def migrate():
    """Update account_type values to match new AccountTypeEnum"""
    try:
        with engine.connect() as conn:
            # First, let's see what account types currently exist
            result = conn.execute(text("""
                SELECT DISTINCT account_type FROM account WHERE is_deleted = false
            """))

            existing_types = [row[0] for row in result]
            print(f"Existing account types: {existing_types}")

            # Map old values to new enum values
            migrations = [
                ("UPDATE account SET account_type = 'savings' WHERE account_type = 'debit'",
                 "Migrated 'debit' -> 'savings'"),
                ("UPDATE account SET account_type = 'ewallet' WHERE account_type = 'wallet'",
                 "Migrated 'wallet' -> 'ewallet'"),
                ("UPDATE account SET account_type = 'credit' WHERE account_type = 'credit_card'",
                 "Migrated 'credit_card' -> 'credit'"),
                ("UPDATE account SET account_type = 'current' WHERE account_type = 'checking'",
                 "Migrated 'checking' -> 'current'"),
            ]

            # Execute migrations
            for sql, message in migrations:
                result = conn.execute(text(sql))
                if result.rowcount > 0:
                    print(f"  {message} ({result.rowcount} rows)")

            conn.commit()

            # Verify
            result = conn.execute(text("""
                SELECT DISTINCT account_type FROM account WHERE is_deleted = false
            """))
            new_types = [row[0] for row in result]
            print(f"\nUpdated account types: {new_types}")
            print("SUCCESS: Account types migrated successfully")

    except Exception as e:
        print(f"ERROR: Failed to migrate account types: {e}")

if __name__ == "__main__":
    migrate()
