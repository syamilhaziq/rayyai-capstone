from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

from bson import ObjectId
try:
    from mcp.server.fastmcp import FastMCP
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    FastMCP = None  # type: ignore
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import Table, delete, insert, select, update
from sqlalchemy.orm import Session

from database import Base, SessionLocal, get_mongo_db

# ==========================
# Helper utilities
# ==========================

POSTGRES_ALLOWED_TABLES: frozenset[str] = frozenset(Base.metadata.tables.keys())


@contextmanager
def session_scope() -> Iterable[Session]:
    """Provide a transactional scope around a series of operations."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {key: _serialize_value(inner) for key, inner in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_serialize_value(item) for item in value]
    return value


def _serialize_mapping(mapping: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _serialize_value(value) for key, value in mapping.items()}


def _get_table(table_name: str) -> Table:
    if table_name not in POSTGRES_ALLOWED_TABLES:
        raise ValueError(f"Table '{table_name}' is not registered in the ORM metadata")
    return Base.metadata.tables[table_name]


def _get_column(table: Table, column_name: str):
    if column_name not in table.c:
        raise ValueError(f"Column '{column_name}' does not exist on table '{table.name}'")
    return table.c[column_name]


def _build_filter_expression(table: Table, column: str, operator: str, value: Any):
    column_expr = _get_column(table, column)
    match operator:
        case "eq":
            return column_expr == value
        case "ne":
            return column_expr != value
        case "lt":
            return column_expr < value
        case "le":
            return column_expr <= value
        case "gt":
            return column_expr > value
        case "ge":
            return column_expr >= value
        case "in":
            if not isinstance(value, list | tuple | set):
                raise ValueError("'in' operator requires a list, tuple, or set of values")
            return column_expr.in_(list(value))
        case "like":
            if not isinstance(value, str):
                raise ValueError("'like' operator requires a string value")
            return column_expr.like(value)
        case _:
            raise ValueError(f"Unsupported operator '{operator}'")


def _ensure_no_dollar_keys(payload: Dict[str, Any], *, context: str) -> None:
    for key, inner_value in payload.items():
        if key.startswith("$"):
            raise ValueError(f"MongoDB {context} must not contain operators starting with '$'")
        if isinstance(inner_value, dict):
            _ensure_no_dollar_keys(inner_value, context=context)


# ==========================
# Pydantic models
# ==========================

class PostgresFilter(BaseModel):
    column: str = Field(..., description="Column name")
    operator: str = Field("eq", description="Comparison operator: eq, ne, lt, le, gt, ge, in, like")
    value: Any = Field(..., description="Comparison value")

    @model_validator(mode="after")
    def validate_operator(self) -> "PostgresFilter":
        allowed = {"eq", "ne", "lt", "le", "gt", "ge", "in", "like"}
        if self.operator not in allowed:
            raise ValueError(f"Unsupported operator '{self.operator}'. Allowed: {', '.join(sorted(allowed))}")
        if self.operator == "in" and not isinstance(self.value, (list, tuple, set)):
            raise ValueError("The 'in' operator requires a list/tuple/set value")
        return self


class PostgresQueryArgs(BaseModel):
    table: str = Field(..., description="Table name defined in SQLAlchemy models")
    columns: Optional[List[str]] = Field(None, description="Subset of columns to return")
    filters: Optional[List[PostgresFilter]] = Field(None, description="Filter predicates")
    limit: int = Field(50, ge=1, le=200, description="Maximum rows to return (1-200)")
    offset: int = Field(0, ge=0, description="Zero-based offset")
    order_by: Optional[str] = Field(None, description="Column name to order by")
    order_desc: bool = Field(False, description="Sort descending if true")


class PostgresInsertArgs(BaseModel):
    table: str
    values: Dict[str, Any]
    returning: Optional[List[str]] = Field(None, description="Columns to return from inserted row(s)")


class PostgresUpdateArgs(BaseModel):
    table: str
    filters: List[PostgresFilter]
    values: Dict[str, Any]
    returning: Optional[List[str]] = Field(None, description="Columns to return from updated row(s)")

    @model_validator(mode="after")
    def require_filters(self) -> "PostgresUpdateArgs":
        if not self.filters:
            raise ValueError("At least one filter is required to prevent broad updates")
        if not self.values:
            raise ValueError("'values' cannot be empty for an update")
        return self


class PostgresDeleteArgs(BaseModel):
    table: str
    filters: List[PostgresFilter]
    returning: Optional[List[str]] = Field(None, description="Columns to return from deleted row(s)")

    @model_validator(mode="after")
    def require_filters(self) -> "PostgresDeleteArgs":
        if not self.filters:
            raise ValueError("At least one filter is required to prevent broad deletes")
        return self


class MongoSort(BaseModel):
    field: str
    direction: str = Field("asc", description="'asc' or 'desc'")

    @model_validator(mode="after")
    def validate_direction(self) -> "MongoSort":
        if self.direction not in {"asc", "desc"}:
            raise ValueError("direction must be 'asc' or 'desc'")
        return self


class MongoFindArgs(BaseModel):
    collection: str
    filter: Dict[str, Any] = Field(default_factory=dict)
    projection: Optional[List[str]] = None
    limit: int = Field(50, ge=1, le=200)
    skip: int = Field(0, ge=0)
    sort: Optional[List[MongoSort]] = None


class MongoInsertArgs(BaseModel):
    collection: str
    documents: List[Dict[str, Any]]

    @model_validator(mode="before")
    @classmethod
    def coerce_documents(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        docs = values.get("documents")
        if docs is None and "document" in values:
            docs = values["document"]
        if docs is None:
            raise ValueError("'documents' (or 'document') is required")
        if isinstance(docs, dict):
            values["documents"] = [docs]
        elif isinstance(docs, list):
            if not docs:
                raise ValueError("'documents' list cannot be empty")
            values["documents"] = docs
        else:
            raise ValueError("'documents' must be a dict or list of dicts")
        return values


class MongoUpdateArgs(BaseModel):
    collection: str
    filter: Dict[str, Any]
    set_fields: Dict[str, Any]
    many: bool = Field(False, description="Update many documents if true, else single document")

    @model_validator(mode="after")
    def validate_payloads(self) -> "MongoUpdateArgs":
        if not self.filter:
            raise ValueError("Filter cannot be empty")
        if not self.set_fields:
            raise ValueError("set_fields cannot be empty")
        return self


class MongoDeleteArgs(BaseModel):
    collection: str
    filter: Dict[str, Any]
    many: bool = Field(False, description="Delete many documents if true, else single document")

    @model_validator(mode="after")
    def validate_filter(self) -> "MongoDeleteArgs":
        if not self.filter:
            raise ValueError("Filter cannot be empty")
        return self


# ==========================
# Tool registration
# ==========================

_TOOL_REGISTRATION_COMPLETE = False


def register_tools(server: Optional[FastMCP]) -> None:
    """Register tools with the MCP server."""
    if not MCP_AVAILABLE or server is None:
        return
    global _TOOL_REGISTRATION_COMPLETE
    if _TOOL_REGISTRATION_COMPLETE:
        return

    _register_postgres_tools(server)
    _register_mongo_tools(server)

    _TOOL_REGISTRATION_COMPLETE = True


# ----- Postgres tools -----

def _register_postgres_tools(server: Optional[FastMCP]) -> None:
    """Register PostgreSQL tools with the MCP server."""
    if not MCP_AVAILABLE or server is None:
        return
    @server.tool(name="postgres_query", description="Fetch rows from an allowed Postgres table")
    def postgres_query(args: PostgresQueryArgs) -> Dict[str, Any]:
        table = _get_table(args.table)

        statement = select(*[_get_column(table, col) for col in args.columns] if args.columns else [table])

        if args.filters:
            for filter_ in args.filters:
                statement = statement.where(_build_filter_expression(table, filter_.column, filter_.operator, filter_.value))

        if args.order_by:
            order_column = _get_column(table, args.order_by)
            statement = statement.order_by(order_column.desc() if args.order_desc else order_column.asc())

        statement = statement.limit(args.limit).offset(args.offset)

        with session_scope() as session:
            result = session.execute(statement).mappings().all()

        return {
            "table": table.name,
            "rows": [_serialize_mapping(dict(row)) for row in result],
            "count": len(result),
        }

    @server.tool(name="postgres_insert", description="Insert row(s) into an allowed Postgres table")
    def postgres_insert(args: PostgresInsertArgs) -> Dict[str, Any]:
        table = _get_table(args.table)

        invalid_columns = set(args.values.keys()) - set(table.c.keys())
        if invalid_columns:
            raise ValueError(f"Unknown column(s) for table '{table.name}': {', '.join(sorted(invalid_columns))}")

        statement = insert(table).values(**args.values)
        if args.returning:
            statement = statement.returning(*[_get_column(table, col) for col in args.returning])

        with session_scope() as session:
            result = session.execute(statement)
            output_rows = result.mappings().all() if args.returning else []

        return {
            "table": table.name,
            "inserted": result.rowcount,  # type: ignore[attr-defined]
            "rows": [_serialize_mapping(dict(row)) for row in output_rows],
        }

    @server.tool(name="postgres_update", description="Update rows in an allowed Postgres table")
    def postgres_update(args: PostgresUpdateArgs) -> Dict[str, Any]:
        table = _get_table(args.table)

        statement = update(table)
        for filter_ in args.filters:
            statement = statement.where(_build_filter_expression(table, filter_.column, filter_.operator, filter_.value))

        invalid_columns = set(args.values.keys()) - set(table.c.keys())
        if invalid_columns:
            raise ValueError(f"Unknown column(s) for table '{table.name}': {', '.join(sorted(invalid_columns))}")

        statement = statement.values(**args.values)
        if args.returning:
            statement = statement.returning(*[_get_column(table, col) for col in args.returning])

        with session_scope() as session:
            result = session.execute(statement)
            output_rows = result.mappings().all() if args.returning else []

        return {
            "table": table.name,
            "updated": result.rowcount,  # type: ignore[attr-defined]
            "rows": [_serialize_mapping(dict(row)) for row in output_rows],
        }

    @server.tool(name="postgres_delete", description="Delete rows from an allowed Postgres table")
    def postgres_delete(args: PostgresDeleteArgs) -> Dict[str, Any]:
        table = _get_table(args.table)

        statement = delete(table)
        for filter_ in args.filters:
            statement = statement.where(_build_filter_expression(table, filter_.column, filter_.operator, filter_.value))

        if args.returning:
            statement = statement.returning(*[_get_column(table, col) for col in args.returning])

        with session_scope() as session:
            result = session.execute(statement)
            output_rows = result.mappings().all() if args.returning else []

        return {
            "table": table.name,
            "deleted": result.rowcount,  # type: ignore[attr-defined]
            "rows": [_serialize_mapping(dict(row)) for row in output_rows],
        }


# ----- Mongo tools -----

def _register_mongo_tools(server: Optional[FastMCP]) -> None:
    """Register MongoDB tools with the MCP server."""
    if not MCP_AVAILABLE or server is None:
        return
    
    def _get_collection(db, collection_name: str):
        if collection_name not in db.list_collection_names():
            raise ValueError(f"Collection '{collection_name}' does not exist")
        return db[collection_name]

    @server.tool(name="mongo_find", description="Find documents in an allowed MongoDB collection")
    def mongo_find(args: MongoFindArgs) -> Dict[str, Any]:
        db = get_mongo_db()
        collection = _get_collection(db, args.collection)

        _ensure_no_dollar_keys(args.filter, context="filter")
        projection = {field: True for field in args.projection} if args.projection else None

        cursor = collection.find(args.filter, projection=projection, skip=args.skip, limit=args.limit)

        if args.sort:
            sort_fields = [(sort.field, 1 if sort.direction == "asc" else -1) for sort in args.sort]
            cursor = cursor.sort(sort_fields)

        documents = [
            _serialize_mapping({**doc, "_id": str(doc.get("_id"))})
            for doc in cursor
        ]
        return {
            "collection": args.collection,
            "count": len(documents),
            "documents": documents,
        }

    @server.tool(name="mongo_insert", description="Insert document(s) into an allowed MongoDB collection")
    def mongo_insert(args: MongoInsertArgs) -> Dict[str, Any]:
        db = get_mongo_db()
        collection = _get_collection(db, args.collection)

        inserted_ids: List[str]
        if len(args.documents) == 1:
            result = collection.insert_one(args.documents[0])
            inserted_ids = [str(result.inserted_id)]
        else:
            result = collection.insert_many(args.documents)
            inserted_ids = [str(_id) for _id in result.inserted_ids]

        return {
            "collection": args.collection,
            "inserted_ids": inserted_ids,
            "count": len(inserted_ids),
        }

    @server.tool(name="mongo_update", description="Update document(s) in an allowed MongoDB collection")
    def mongo_update(args: MongoUpdateArgs) -> Dict[str, Any]:
        db = get_mongo_db()
        collection = _get_collection(db, args.collection)

        _ensure_no_dollar_keys(args.filter, context="filter")
        _ensure_no_dollar_keys(args.set_fields, context="set_fields")

        update_doc = {"$set": args.set_fields}
        if args.many:
            result = collection.update_many(args.filter, update_doc)
        else:
            result = collection.update_one(args.filter, update_doc)

        return {
            "collection": args.collection,
            "matched_count": result.matched_count,
            "modified_count": result.modified_count,
        }

    @server.tool(name="mongo_delete", description="Delete document(s) from an allowed MongoDB collection")
    def mongo_delete(args: MongoDeleteArgs) -> Dict[str, Any]:
        db = get_mongo_db()
        collection = _get_collection(db, args.collection)

        _ensure_no_dollar_keys(args.filter, context="filter")

        if args.many:
            result = collection.delete_many(args.filter)
        else:
            result = collection.delete_one(args.filter)

        return {
            "collection": args.collection,
            "deleted_count": result.deleted_count,
        }
