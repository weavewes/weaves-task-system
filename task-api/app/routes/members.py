"""Member routes — list members and query their tasks."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Any

from app.database import get_db
from app.schemas import (
    MemberListResponse,
    MemberResponse,
    MemberTaskResponse,
    TaskResponse,
    TaskListResponse,
)

router = APIRouter(prefix="/members", tags=["members"])


# ─────────────────────────────────────────────
# POST /members — Create new member
# ─────────────────────────────────────────────
@router.post("", status_code=201, response_model=dict)
async def create_member(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Create a new member.
    Required fields: tipo_miembro, codigo, nombre.
    Validates codigo uniqueness before insert.
    """
    missing = [f for f in ["tipo_miembro", "codigo", "nombre"] if not payload.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Required fields missing: {', '.join(missing)}"
        )

    # Check codigo uniqueness
    check = await db.execute(
        text("SELECT id FROM miembros WHERE codigo = :codigo"),
        {"codigo": payload["codigo"].upper()}
    )
    if check.fetchone():
        raise HTTPException(
            status_code=409,
            detail=f"Member with code '{payload['codigo']}' already exists"
        )

    allowed_fields = [
        "tipo_miembro", "codigo", "nombre", "nombre_visible", "rol", "area",
        "email", "telefono", "whatsapp", "telegram_username", "mattermost_username",
        "modelo", "proveedor_modelo", "endpoint_api", "prompt_base",
        "zona_horaria", "horario_laboral", "disponibilidad_actual",
        "puede_recibir_tareas", "max_tareas_activas", "prioridad_asignacion",
        "estado", "habilidades", "notas",
    ]

    field_names = []
    placeholders = []
    values = []

    for field in allowed_fields:
        if field in payload and payload[field] is not None:
            field_names.append(field)
            placeholders.append(f":{field}")
            values.append(payload[field])

    # Normalize codigo to uppercase
    if "codigo" in field_names:
        idx = field_names.index("codigo")
        values[idx] = values[idx].upper()

    query = text(f"""
        INSERT INTO miembros ({', '.join(field_names)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """)
    params = {field: val for field, val in zip(field_names, values)}

    result = await db.execute(query, params)
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)


# ─────────────────────────────────────────────
# PATCH /members/{member_id} — Partial update
# ─────────────────────────────────────────────
@router.patch("/{member_id}", response_model=dict)
async def update_member(member_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Update a member — only provided fields are updated (partial update).
    If codigo is changed, validates uniqueness.
    """
    # Verify member exists
    check = await db.execute(
        text("SELECT id FROM miembros WHERE id = :id"),
        {"id": member_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    # Validate codigo uniqueness if being changed
    if "codigo" in payload and payload["codigo"] is not None:
        new_codigo = payload["codigo"].upper()
        check = await db.execute(
            text("SELECT id FROM miembros WHERE codigo = :codigo AND id != :id"),
            {"codigo": new_codigo, "id": member_id}
        )
        if check.fetchone():
            raise HTTPException(
                status_code=409,
                detail=f"Member with code '{payload['codigo']}' already exists"
            )

    allowed_fields = [
        "tipo_miembro", "codigo", "nombre", "nombre_visible", "rol", "area",
        "email", "telefono", "whatsapp", "telegram_username", "mattermost_username",
        "modelo", "proveedor_modelo", "endpoint_api", "prompt_base",
        "zona_horaria", "horario_laboral", "disponibilidad_actual",
        "puede_recibir_tareas", "max_tareas_activas", "prioridad_asignacion",
        "estado", "habilidades", "notas",
    ]

    set_clauses = []
    values = {}

    for field in allowed_fields:
        if field in payload:
            val = payload[field]
            if field == "codigo" and val is not None:
                val = val.upper()
            set_clauses.append(f"{field} = :{field}")
            values[field] = val

    if not set_clauses:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    values["id"] = member_id

    query = text(f"""
        UPDATE miembros SET {', '.join(set_clauses)}, updated_at = NOW()
        WHERE id = :id
        RETURNING *
    """)

    result = await db.execute(query, values)
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)


# ─────────────────────────────────────────────
# GET /members — List all active members
# ─────────────────────────────────────────────
@router.get("", response_model=MemberListResponse)
async def list_members(db: AsyncSession = Depends(get_db)):
    """List all active members."""
    result = await db.execute(
        text("""
            SELECT id, tipo_miembro, codigo, nombre, nombre_visible, rol, area,
                   descripcion, email, telefono, whatsapp, telegram_username,
                   mattermost_username, modelo, proveedor_modelo, endpoint_api,
                   prompt_base, zona_horaria, horario_laboral, disponibilidad_actual,
                   puede_recibir_tareas, max_tareas_activas, prioridad_asignacion,
                   estado, habilidades, notas, created_at, updated_at
            FROM miembros
            WHERE estado = 'ACTIVO'
            ORDER BY prioridad_asignacion ASC, nombre ASC
        """)
    )
    rows = result.fetchall()
    members = [dict(row._mapping) for row in rows]
    return MemberListResponse(total=len(members), members=members)


@router.get("/code/{codigo}", response_model=MemberResponse)
async def get_member_by_code(codigo: str, db: AsyncSession = Depends(get_db)):
    """Get a single member by their code (e.g. FORGE, YOA, HECTOR_1)."""
    result = await db.execute(
        text("""
            SELECT id, tipo_miembro, codigo, nombre, nombre_visible, rol, area,
                   descripcion, email, telefono, whatsapp, telegram_username,
                   mattermost_username, modelo, proveedor_modelo, endpoint_api,
                   prompt_base, zona_horaria, horario_laboral, disponibilidad_actual,
                   puede_recibir_tareas, max_tareas_activas, prioridad_asignacion,
                   estado, habilidades, notas, created_at, updated_at
            FROM miembros
            WHERE codigo = :codigo AND estado = 'ACTIVO'
        """),
        {"codigo": codigo.upper()}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Member with code '{codigo}' not found")
    return dict(row._mapping)


@router.get("/code/{codigo}/tasks", response_model=TaskListResponse)
async def get_member_tasks(
    codigo: str,
    status: Optional[str] = Query(None, description="Filter by task status"),
    role: Optional[str] = Query(
        None,
        description="Role filter: assigned, responsible, reviewer, created_by, all"
    ),
    db: AsyncSession = Depends(get_db)
):
    """
    Get tasks for a member filtered by role.
    
    - assigned: tasks where member is assigned_member_id
    - responsible: tasks where member is responsible_member_id
    - reviewer: tasks where member is reviewer_member_id
    - created_by: tasks created by the member
    - all: all roles (default if role not specified)
    """
    # First resolve the member code to an ID
    member_result = await db.execute(
        text("SELECT id FROM miembros WHERE codigo = :codigo AND estado = 'ACTIVO'"),
        {"codigo": codigo.upper()}
    )
    member_row = member_result.fetchone()
    if not member_row:
        raise HTTPException(status_code=404, detail=f"Member with code '{codigo}' not found")
    member_id = member_row[0]

    # Build role-based filter
    role_filters = {
        "assigned": "assigned_member_id = :member_id",
        "responsible": "responsible_member_id = :member_id",
        "reviewer": "reviewer_member_id = :member_id",
        "created_by": "created_by_member_id = :member_id",
    }

    if role and role not in role_filters:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role}'. Valid: {list(role_filters.keys())}"
        )

    if role:
        where_clause = f"WHERE {role_filters[role]}"
    else:
        where_clause = (
            "WHERE (assigned_member_id = :member_id OR responsible_member_id = :member_id "
            "OR reviewer_member_id = :member_id OR created_by_member_id = :member_id)"
        )

    if status:
        where_clause += " AND status = :status"

    query = text(f"""
        SELECT id, codigo, title, description, expected_output, acceptance_criteria,
               status, priority, task_type, client_id, project_id,
               assigned_member_id, responsible_member_id, reviewer_member_id,
               created_by_member_id, worker_id, claimed_at, lease_expires_at,
               started_at, completed_at, due_date, visible_para_pm,
               requiere_aprobacion, bloqueada_por, motivo_bloqueo,
               fecha_ultimo_seguimiento, proxima_accion, source, external_id,
               context_data, input_payload, result_payload,
               agent_notes, human_notes, error_message, retry_count, max_retries,
               created_at, updated_at
        FROM tasks
        {where_clause}
        ORDER BY priority DESC, created_at ASC
    """)

    params = {"member_id": member_id}
    if status:
        params["status"] = status

    result = await db.execute(query, params)
    rows = result.fetchall()
    tasks = [dict(row._mapping) for row in rows]
    return TaskListResponse(total=len(tasks), items=tasks)