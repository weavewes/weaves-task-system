"""Task routes — CRUD, claim, heartbeat, complete, fail, requeue."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timedelta
import json

from app.database import get_db, get_async_connection
from app.schemas import (
    TaskCreate,
    TaskResponse,
    TaskDetailResponse,
    TaskListResponse,
    ClaimNextPayload,
    ClaimNextResponse,
    HeartbeatPayload,
    CompletePayload,
    FailPayload,
    RequeueExpiredPayload,
    RequeueResponse,
    TaskEventResponse,
    TaskLogCreate,
    TaskLogResponse,
    LogListResponse,
    EventListResponse,
    ClientResponse,
    ProjectResponse,
    MemberResponse,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ─────────────────────────────────────────────
# Helper: resolve member code → id
# ─────────────────────────────────────────────
async def resolve_member_code(db: AsyncSession, code: str) -> int:
    result = await db.execute(
        text("SELECT id FROM miembros WHERE codigo = :code AND estado = 'ACTIVO'"),
        {"code": code.upper()}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Member '{code}' not found")
    return row[0]


# ─────────────────────────────────────────────
# Helper: resolve member id → code (for lookup)
# ─────────────────────────────────────────────
async def get_member_by_id(db: AsyncSession, member_id: int) -> Optional[dict]:
    result = await db.execute(
        text("SELECT * FROM miembros WHERE id = :id"),
        {"id": member_id}
    )
    row = result.fetchone()
    return dict(row._mapping) if row else None


# ─────────────────────────────────────────────
# Helper: get task codigo prefix
# ─────────────────────────────────────────────
async def generate_task_codigo(db: AsyncSession) -> str:
    result = await db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM tasks"))
    next_id = result.scalar()
    return f"TASK-{next_id:04d}"


# ─────────────────────────────────────────────
# Helper: register task event
# ─────────────────────────────────────────────
async def register_event(
    conn,
    task_id: int,
    event_type: str,
    old_status: Optional[str],
    new_status: Optional[str],
    message: Optional[str] = None,
    created_by_member_id: Optional[int] = None,
    metadata: Optional[dict] = None,
):
    await conn.execute(
        """
            INSERT INTO task_events
                (task_id, event_type, old_status, new_status, message, created_by_member_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        task_id, event_type, old_status, new_status, message,
        created_by_member_id,
        json.dumps(metadata) if metadata else None,
    )


# ─────────────────────────────────────────────
# Helper: register task log
# ─────────────────────────────────────────────
async def register_log(
    conn,
    task_id: int,
    member_id: Optional[int],
    log_level: str,
    message: str,
    metadata: Optional[dict] = None,
):
    await conn.execute(
        """
            INSERT INTO task_logs (task_id, member_id, log_level, message, metadata)
            VALUES ($1, $2, $3, $4, $5)
        """,
        task_id, member_id, log_level, message,
        json.dumps(metadata) if metadata else None,
    )


# ─────────────────────────────────────────────
# Helper: build task response row → dict
# ─────────────────────────────────────────────
def task_row_to_dict(row) -> dict:
    return dict(row._mapping)


# ─────────────────────────────────────────────
# POST /tasks
# ─────────────────────────────────────────────
# POST /tasks
# ─────────────────────────────────────────────
@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new task. Accepts member codes; resolves to IDs internally."""
    # Resolve member codes to IDs
    assigned_id = None
    responsible_id = None
    reviewer_id = None
    created_by_id = None

    conn = await get_async_connection()
    try:
        # Resolve member codes using raw connection (for speed)
        if payload.assigned_member_code:
            row = await conn.fetchrow(
                "SELECT id FROM miembros WHERE codigo = $1 AND estado = 'ACTIVO'",
                payload.assigned_member_code.upper()
            )
            assigned_id = row["id"] if row else None
        if payload.responsible_member_code:
            row = await conn.fetchrow(
                "SELECT id FROM miembros WHERE codigo = $1 AND estado = 'ACTIVO'",
                payload.responsible_member_code.upper()
            )
            responsible_id = row["id"] if row else None
        if payload.reviewer_member_code:
            row = await conn.fetchrow(
                "SELECT id FROM miembros WHERE codigo = $1 AND estado = 'ACTIVO'",
                payload.reviewer_member_code.upper()
            )
            reviewer_id = row["id"] if row else None
        if payload.created_by_member_code:
            row = await conn.fetchrow(
                "SELECT id FROM miembros WHERE codigo = $1 AND estado = 'ACTIVO'",
                payload.created_by_member_code.upper()
            )
            created_by_id = row["id"] if row else None

        # Generate codigo
        next_id_row = await conn.fetchrow("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM tasks")
        next_id = next_id_row["next_id"]
        codigo = f"TASK-{next_id:04d}"

        status = payload.status or "PENDIENTE"
        priority = payload.priority or 3

        row = await conn.fetchrow(
            """
            INSERT INTO tasks (
                codigo, title, description, expected_output, acceptance_criteria,
                status, priority, task_type, client_id, project_id,
                assigned_member_id, responsible_member_id, reviewer_member_id,
                created_by_member_id, source, context_data, input_payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
            """,
            codigo, payload.title, payload.description, payload.expected_output,
            payload.acceptance_criteria, status, priority, payload.task_type,
            payload.client_id, payload.project_id,
            assigned_id, responsible_id, reviewer_id, created_by_id,
            payload.source,
            json.dumps(payload.context_data) if payload.context_data else None,
            json.dumps(payload.input_payload) if payload.input_payload else None,
        )
        task = dict(row)

        # Register TASK_CREATED event
        await register_event(conn, task["id"], "TASK_CREATED", None, status,
                            f"Task '{codigo}' created", created_by_id)

        # If assigned, also register TASK_ASSIGNED
        if assigned_id:
            await register_event(conn, task["id"], "TASK_ASSIGNED", None, status,
                                f"Task assigned to {payload.assigned_member_code}", created_by_id)

        await conn.execute("COMMIT")
        return task
    except Exception as e:
        await conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


# ─────────────────────────────────────────────
# GET /tasks
# ─────────────────────────────────────────────
@router.get("", response_model=TaskListResponse)
async def list_tasks(
    status: Optional[str] = Query(None),
    assigned_member_code: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    task_type: Optional[str] = Query(None),
    priority_min: Optional[int] = Query(None, ge=1, le=10),
    skip: int = Query(0, ge=0),
    take: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List tasks with optional filters."""
    conditions = []
    params = {}

    if status:
        conditions.append("status = :status")
        params["status"] = status
    if assigned_member_code:
        member_id = await resolve_member_code(db, assigned_member_code)
        conditions.append("assigned_member_id = :assigned_id")
        params["assigned_id"] = member_id
    if project_id:
        conditions.append("project_id = :project_id")
        params["project_id"] = project_id
    if client_id:
        conditions.append("client_id = :client_id")
        params["client_id"] = client_id
    if task_type:
        conditions.append("task_type = :task_type")
        params["task_type"] = task_type
    if priority_min:
        conditions.append("priority >= :priority_min")
        params["priority_min"] = priority_min

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    # Count
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM tasks {where_clause}"), params)
    total = count_result.scalar()

    # Fetch
    query = text(f"""
        SELECT * FROM tasks
        {where_clause}
        ORDER BY priority DESC, created_at ASC
        LIMIT :take OFFSET :skip
    """)
    params["take"] = take
    params["skip"] = skip
    result = await db.execute(query, params)
    rows = result.fetchall()
    tasks = [dict(row._mapping) for row in rows]
    return TaskListResponse(total=total, items=tasks)


# ─────────────────────────────────────────────
# GET /tasks/{task_id}
# ─────────────────────────────────────────────
@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single task with full related info (client, project, members)."""
    result = await db.execute(text("SELECT * FROM tasks WHERE id = :id"), {"id": task_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    task = dict(row._mapping)

    # Resolve related entities
    client = None
    project = None
    assigned_member = None
    responsible_member = None
    reviewer_member = None
    created_by_member = None

    if task.get("client_id"):
        cr = await db.execute(text("SELECT * FROM clientes WHERE id = :id"), {"id": task["client_id"]})
        crow = cr.fetchone()
        if crow:
            client = dict(crow._mapping)

    if task.get("project_id"):
        pr = await db.execute(text("SELECT * FROM proyectos WHERE id = :id"), {"id": task["project_id"]})
        prow = pr.fetchone()
        if prow:
            project = dict(prow._mapping)

    for field, dest in [
        ("assigned_member_id", "assigned_member"),
        ("responsible_member_id", "responsible_member"),
        ("reviewer_member_id", "reviewer_member"),
        ("created_by_member_id", "created_by_member"),
    ]:
        mid = task.get(field)
        if mid:
            mr = await db.execute(text("SELECT * FROM miembros WHERE id = :id"), {"id": mid})
            mrow = mr.fetchone()
            if mrow:
                locals()[dest] = dict(mrow._mapping)

    return TaskDetailResponse(
        **task,
        client=client,
        project=project,
        assigned_member=assigned_member,
        responsible_member=responsible_member,
        reviewer_member=reviewer_member,
        created_by_member=created_by_member,
    )


# ─────────────────────────────────────────────
# POST /tasks/claim-next ⭐ CRITICAL
# ─────────────────────────────────────────────
@router.post("/claim-next", response_model=ClaimNextResponse)
async def claim_next(payload: ClaimNextPayload):
    """
    Atomically claim the next highest-priority PENDIENTE task assigned to the member.
    Uses FOR UPDATE SKIP LOCKED for safe concurrent access.
    """
    conn = await get_async_connection()
    try:
        # Resolve member code → id
        member_result = await conn.fetchrow(
            "SELECT id, nombre FROM miembros WHERE codigo = $1 AND estado = 'ACTIVO'",
            payload.member_code.upper()
        )
        if not member_result:
            raise HTTPException(status_code=404, detail=f"Member '{payload.member_code}' not found")
        member_id = member_result["id"]

        # Atomic select + lock
        row = await conn.fetchrow(
            """
            SELECT id FROM tasks
            WHERE assigned_member_id = $1
              AND status = 'PENDIENTE'
            ORDER BY priority DESC, created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """,
            member_id
        )

        if not row:
            return ClaimNextResponse(
                claimed=False,
                message=f"No hay tareas pendientes para {payload.member_code}."
            )

        task_id = row["id"]
        now = datetime.utcnow()
        lease_expires = now + timedelta(minutes=payload.lease_minutes)

        # Update to EN_PROGRESO
        await conn.execute(
            """
            UPDATE tasks SET
                status = 'EN_PROGRESO',
                worker_id = $1,
                claimed_at = $2,
                started_at = $2,
                lease_expires_at = $3,
                updated_at = NOW()
            WHERE id = $4
            """,
            payload.worker_id, now, lease_expires, task_id
        )

        # Register events and log
        await register_event(
            conn, task_id, "TASK_CLAIMED", "PENDIENTE", "EN_PROGRESO",
            f"Task claimed by {payload.member_code} (worker: {payload.worker_id})",
            member_id
        )
        await register_log(
            conn, task_id, member_id, "INFO",
            f"Task claimed. Worker: {payload.worker_id}, lease: {payload.lease_minutes}min",
            {"worker_id": payload.worker_id, "lease_minutes": payload.lease_minutes}
        )
        await conn.execute("COMMIT")

        # Fetch updated task
        task_row = await conn.fetchrow("SELECT * FROM tasks WHERE id = $1", task_id)
        return ClaimNextResponse(claimed=True, task=dict(task_row))

    except HTTPException:
        raise
    except Exception as e:
        await conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


# ─────────────────────────────────────────────
# POST /tasks/{task_id}/heartbeat
# ─────────────────────────────────────────────
@router.post("/{task_id}/heartbeat", response_model=TaskResponse)
async def task_heartbeat(task_id: int, payload: HeartbeatPayload, db: AsyncSession = Depends(get_db)):
    """Extend the lease on an in-progress task."""
    member_id = await resolve_member_code(db, payload.member_code)

    # Verify task is EN_PROGRESO and worker matches
    result = await db.execute(
        text("SELECT * FROM tasks WHERE id = :id AND status = 'EN_PROGRESO'"),
        {"id": task_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not in progress or not found")

    task = dict(row._mapping)
    if task.get("worker_id") != payload.worker_id:
        raise HTTPException(status_code=403, detail="Worker ID mismatch — not your task")

    lease_expires = datetime.utcnow() + timedelta(minutes=payload.lease_minutes)
    await db.execute(
        text("""
            UPDATE tasks SET lease_expires_at = :lease, fecha_ultimo_seguimiento = NOW(), updated_at = NOW()
            WHERE id = :id
        """),
        {"lease": lease_expires, "id": task_id}
    )

    conn = await get_async_connection()
    try:
        await register_log(conn, task_id, member_id, "INFO",
                           f"Heartbeat from {payload.member_code}: {payload.message}",
                           {"worker_id": payload.worker_id, "lease_minutes": payload.lease_minutes})
        await register_event(conn, task_id, "TASK_HEARTBEAT", None, None,
                             f"Lease extended by {payload.lease_minutes}min", member_id)
        await conn.execute("COMMIT")
    finally:
        await conn.close()

    await db.commit()

    result = await db.execute(text("SELECT * FROM tasks WHERE id = :id"), {"id": task_id})
    return dict(result.fetchone()._mapping)


# ─────────────────────────────────────────────
# POST /tasks/{task_id}/complete
# ─────────────────────────────────────────────
@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: int, payload: CompletePayload, db: AsyncSession = Depends(get_db)):
    """Complete a task. Moves to EN_REVISION if requiere_aprobacion=true, otherwise COMPLETADA."""
    member_id = await resolve_member_code(db, payload.member_code)

    result = await db.execute(text("SELECT * FROM tasks WHERE id = :id"), {"id": task_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    task = dict(row._mapping)

    if task["status"] != "EN_PROGRESO":
        raise HTTPException(status_code=400, detail=f"Task is not in progress (status: {task['status']})")

    if task.get("worker_id") and task["worker_id"] != payload.worker_id:
        raise HTTPException(status_code=403, detail="Worker ID mismatch")

    new_status = "EN_REVISION" if task.get("requiere_aprobacion") else "COMPLETADA"
    now = datetime.utcnow()

    await db.execute(
        text(f"""
            UPDATE tasks SET
                status = '{new_status}',
                completed_at = CASE WHEN '{new_status}' = 'COMPLETADA' THEN NOW() ELSE NULL END,
                result_payload = :result_payload,
                agent_notes = :agent_notes,
                fecha_ultimo_seguimiento = NOW(),
                updated_at = NOW(),
                worker_id = NULL,
                lease_expires_at = NULL
            WHERE id = :id
        """),
        {
            "result_payload": json.dumps(payload.result_payload) if payload.result_payload else None,
            "agent_notes": payload.agent_notes,
            "id": task_id,
        }
    )

    conn = await get_async_connection()
    try:
        event_type = "TASK_COMPLETED" if new_status == "COMPLETADA" else "TASK_READY_FOR_REVIEW"
        await register_event(conn, task_id, event_type, task["status"], new_status,
                             f"Completed by {payload.member_code}. Notes: {payload.agent_notes}", member_id,
                             {"result_payload": payload.result_payload})
        await register_log(conn, task_id, member_id, "INFO",
                           f"Task completed. Status: {new_status}. Notes: {payload.agent_notes}",
                           {"result_payload": payload.result_payload})
        await conn.execute("COMMIT")
    finally:
        await conn.close()

    await db.commit()
    result = await db.execute(text("SELECT * FROM tasks WHERE id = :id"), {"id": task_id})
    return dict(result.fetchone()._mapping)


# ─────────────────────────────────────────────
# POST /tasks/{task_id}/fail
# ─────────────────────────────────────────────
@router.post("/{task_id}/fail", response_model=TaskResponse)
async def fail_task(task_id: int, payload: FailPayload, db: AsyncSession = Depends(get_db)):
    """Mark a task as failed/blocked. Valid next_status: ERROR, BLOQUEADA, ESPERANDO_HUMANO, ESPERANDO_CLIENTE."""
    member_id = await resolve_member_code(db, payload.member_code)
    valid_statuses = ["ERROR", "BLOQUEADA", "ESPERANDO_HUMANO", "ESPERANDO_CLIENTE"]
    if payload.next_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"next_status must be one of {valid_statuses}")

    result = await db.execute(text("SELECT * FROM tasks WHERE id = :id"), {"id": task_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    task = dict(row._mapping)

    # Increment retry count if going to ERROR
    retry_increment = 1 if payload.next_status == "ERROR" else 0

    await db.execute(
        text("""
            UPDATE tasks SET
                status = :new_status,
                error_message = :error_message,
                agent_notes = :agent_notes,
                retry_count = retry_count + :retry_increment,
                fecha_ultimo_seguimiento = NOW(),
                updated_at = NOW(),
                worker_id = NULL,
                lease_expires_at = NULL
            WHERE id = :id
        """),
        {
            "new_status": payload.next_status,
            "error_message": payload.error_message,
            "agent_notes": payload.agent_notes,
            "retry_increment": retry_increment,
            "id": task_id,
        }
    )

    conn = await get_async_connection()
    try:
        event_type = "TASK_FAILED" if payload.next_status == "ERROR" else "TASK_BLOCKED"
        await register_event(conn, task_id, event_type, task["status"], payload.next_status,
                             f"Failed by {payload.member_code}: {payload.error_message}", member_id,
                             {"agent_notes": payload.agent_notes})
        await register_log(conn, task_id, member_id, "ERROR",
                           f"Task failed: {payload.error_message}. Next: {payload.next_status}",
                           {"error_message": payload.error_message})
        await conn.execute("COMMIT")
    finally:
        await conn.close()

    await db.commit()
    result = await db.execute(text("SELECT * FROM tasks WHERE id = :id"), {"id": task_id})
    return dict(result.fetchone()._mapping)


# ─────────────────────────────────────────────
# POST /tasks/requeue-expired
# ─────────────────────────────────────────────
@router.post("/requeue-expired", response_model=RequeueResponse)
async def requeue_expired(payload: RequeueExpiredPayload, db: AsyncSession = Depends(get_db)):
    """Find EN_PROGRESO tasks with expired leases and requeue or mark as ERROR."""
    conn = await get_async_connection()
    try:
        result = await conn.fetch(
            """
            SELECT id, retry_count, max_retries, worker_id
            FROM tasks
            WHERE status = 'EN_PROGRESO' AND lease_expires_at < NOW()
            """
        )

        requeued = 0
        expired = 0

        for row in result:
            task_id = row["id"]
            retry_count = row["retry_count"] or 0
            max_retries = row["max_retries"] or 3

            if retry_count < payload.max_requeues:
                await conn.execute(
                    """
                    UPDATE tasks SET
                        status = 'PENDIENTE',
                        worker_id = NULL,
                        claimed_at = NULL,
                        started_at = NULL,
                        lease_expires_at = NULL,
                        updated_at = NOW()
                    WHERE id = $1
                    """,
                    task_id
                )
                await register_event(conn, task_id, "TASK_REQUEUED", "EN_PROGRESO", "PENDIENTE",
                                    "Lease expired — requeued automatically")
                await register_log(conn, task_id, None, "WARNING",
                                   "Lease expired, task requeued")
                requeued += 1
            else:
                await conn.execute(
                    "UPDATE tasks SET status = 'ERROR', worker_id = NULL, lease_expires_at = NULL, "
                    "error_message = 'Max requeue retries exceeded', updated_at = NOW() WHERE id = $1",
                    task_id
                )
                await register_event(conn, task_id, "TASK_FAILED", "EN_PROGRESO", "ERROR",
                                    "Max requeue retries exceeded — marked ERROR")
                expired += 1

        await conn.execute("COMMIT")
        return RequeueResponse(
            requeued=requeued,
            expired=expired,
            message=f"Requeued {requeued} tasks, {expired} marked ERROR (max retries)."
        )
    except Exception as e:
        await conn.execute("ROLLBACK")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


# ─────────────────────────────────────────────
# GET /tasks/{task_id}/events
# ─────────────────────────────────────────────
@router.get("/{task_id}/events", response_model=EventListResponse)
async def get_task_events(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get the event history for a task, ordered chronologically."""
    result = await db.execute(
        text("SELECT * FROM task_events WHERE task_id = :id ORDER BY created_at ASC"),
        {"id": task_id}
    )
    rows = result.fetchall()
    events = [dict(row._mapping) for row in rows]
    return EventListResponse(task_id=task_id, events=events)


# ─────────────────────────────────────────────
# GET /tasks/{task_id}/logs
# ─────────────────────────────────────────────
@router.get("/{task_id}/logs", response_model=LogListResponse)
async def get_task_logs(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get the log entries for a task, ordered chronologically."""
    result = await db.execute(
        text("SELECT * FROM task_logs WHERE task_id = :id ORDER BY created_at ASC"),
        {"id": task_id}
    )
    rows = result.fetchall()
    logs = [dict(row._mapping) for row in rows]
    return LogListResponse(task_id=task_id, logs=logs)


# ─────────────────────────────────────────────
# POST /tasks/{task_id}/logs
# ─────────────────────────────────────────────
@router.post("/{task_id}/logs", response_model=TaskLogResponse, status_code=201)
async def add_task_log(task_id: int, payload: TaskLogCreate, db: AsyncSession = Depends(get_db)):
    """Add a log entry to a task."""
    member_id = await resolve_member_code(db, payload.member_code)

    result = await db.execute(
        text("""
            INSERT INTO task_logs (task_id, member_id, log_level, message, metadata)
            VALUES (:task_id, :member_id, :log_level, :message, :metadata)
            RETURNING *
        """),
        {
            "task_id": task_id,
            "member_id": member_id,
            "log_level": payload.log_level or "INFO",
            "message": payload.message,
            "metadata": json.dumps(payload.metadata) if payload.metadata else None,
        }
    )
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)