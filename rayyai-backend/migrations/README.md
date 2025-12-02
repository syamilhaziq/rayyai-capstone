# Database Migrations

This folder contains database migration scripts for the RayyAI backend.

## Migration Files

Migrations are numbered sequentially and should be run in order:

1. **001_add_account_subtype.py** - Adds `account_subtype` column to the `account` table
2. **002_fix_account_types.py** - Renames old account type values to new standardized names

## Running Migrations

### From Project Root

```bash
# Run from the rayyai-backend directory
python -m migrations.001_add_account_subtype
python -m migrations.002_fix_account_types
```

### From Migrations Folder

```bash
cd migrations
python 001_add_account_subtype.py
python 002_fix_account_types.py
```

## Creating New Migrations

When creating a new migration:

1. **Name it sequentially**: `003_description_of_change.py`
2. **Add path handling** for imports:
   ```python
   import sys
   from pathlib import Path
   sys.path.append(str(Path(__file__).parent.parent))

   from database import engine
   ```
3. **Document the change** in the docstring
4. **Update this README** with the new migration

## Current Account Types

After running migrations, valid account types are:
- `savings` - Savings accounts
- `current` - Current/checking accounts
- `credit` - Credit cards
- `ewallet` - E-wallets (GrabPay, Touch n Go, etc.)
- `investment` - Investment accounts
- `cash` - Cash accounts

## Notes

- Migrations are **one-time scripts** - only run them once per database
- Always backup your database before running migrations
- Migrations are tracked in Git for team collaboration and deployment
