"""Task outputs service — create, list, and dependency output aggregation."""
import asyncpg
import json
from typing import Optional

from app.database import get_async_connection
from app.schemas import TaskOutputCreate, DependencyOutputItem


async def resolve_member_code(code: str) -> int:
    """Resolve a member code to its ID."""
    conn = await get_async_connection()
    try:
        row = await conn.fetchrow(
            "SELECT id FROM miembros WHERE codigo = $1 AND estado = 'ACTIVO'",
            code.upper()
        )
        if not row:
            raise ValueError(f"Member '{code}' not found")
        return row["id"]
    finally:
        await conn.close()


async def resolve_member_code_to_name(member_id: int) -> str:
    """Resolve a member id to its codigo (name)."""
    conn = await get_async_connection()
    try:
        row = await conn.fetchrow(
            "SELECT codigo FROM miembros WHERE id = $1",
            member_id
        )
        return row["codigo"] if row else "UNKNOWN"
    finally:
        await conn.close()


async def create_task_output(task_id: int, payload: TaskOutputCreate) -> dict:
    """
    Create a new output attached to a task.
    """
    member_id = await resolve_member_code(payload.member_code)

    conn = await get_async_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO task_outputs (task_id, created_by_member_id, output_type, title, content, file_url, file_path, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            """,
            task_id,
            member_id,
            payload.output_type,
            payload.title,
            payload.content,
            payload.file_url,
            payload.file_path,
            json.dumps(payload.metadata) if payload.metadata else None,
        )
        await conn.execute("COMMIT")
        result = dict(row)
        if result.get("metadata") and isinstance(result["metadata"], str):
            result["metadata"] = json.loads(result["metadata"])
        return result
    except Exception as e:
        await conn.execute("ROLLBACK")
        raise
    finally:
        await conn.close()


async def list_task_outputs(task_id: int) -> list[dict]:
    """
    List all outputs for a specific task.
    """
    conn = await get_async_connection()
    try:
        rows = await conn.fetch(
            "SELECT * FROM task_outputs WHERE task_id = $1 ORDER BY created_at ASC",
            task_id
        )
        return _parse_outputs_rows(rows)
    finally:
        await conn.close()


def _parse_outputs_rows(rows: list) -> list[dict]:
    """Parse task_outputs rows, converting JSON metadata string to dict."""
    results = []
    for row in rows:
        d = dict(row)
        if d.get("metadata") and isinstance(d["metadata"], str):
            try:
                d["metadata"] = json.loads(d["metadata"])
            except (json.JSONDecodeError, TypeError):
                d["metadata"] = {}
        results.append(d)
    return results


async def get_dependency_outputs(task_id: int) -> list[DependencyOutputItem]:
    """
    Get all outputs from tasks that the given task depends on (FINISH_TO_START dependencies).

    Returns a flat list of DependencyOutputItem for each output found in dependency tasks.
    """
    conn = await get_async_connection()
    try:
        # Get all tasks that THIS task depends on (dependencies where task_id = our task)
        dep_rows = await conn.fetch(
            """
            SELECT t.id, t.codigo, t.title, t.status
            FROM task_dependencies td
            JOIN tasks t ON t.id = td.depends_on_task_id
            WHERE td.task_id = $1 AND td.is_required = TRUE
              AND td.dependency_type = 'FINISH_TO_START'
            ORDER BY td.created_at ASC
            """,
            task_id
        )

        results = []
        for dep in dep_rows:
            source_task_id = dep["id"]
            source_task_title = dep["title"]

            # Get outputs for this dependency task
            output_rows = await conn.fetch(
                "SELECT * FROM task_outputs WHERE task_id = $1 ORDER BY created_at ASC",
                source_task_id
            )

            for out_row in _parse_outputs_rows(output_rows):
                member_code = await resolve_member_code_to_name(out_row["created_by_member_id"])
                results.append(DependencyOutputItem(
                    source_task_id=source_task_id,
                    source_task_title=source_task_title,
                    created_by=member_code,
                    output_type=out_row["output_type"],
                    title=out_row.get("title"),
                    content=out_row.get("content"),
                    file_url=out_row.get("file_url"),
                    file_path=out_row.get("file_path"),
                    metadata=out_row.get("metadata") or {},
                    created_at=out_row["created_at"],
                ))

        return results
    finally:
        await conn.close()