"""Project routes — CRUD operations for projects."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

from app.database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])


# ─────────────────────────────────────────────
# GET /projects — List all projects
# ─────────────────────────────────────────────
@router.get("", response_model=dict)
async def list_projects(
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    estado: Optional[str] = Query(None, description="Filter by estado_proyecto"),
    tipo: Optional[str] = Query(None, description="Filter by tipo_proyecto"),
    skip: int = Query(0, ge=0),
    take: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all projects with optional filters."""
    conditions = []
    params = {}

    if client_id:
        conditions.append("cliente_id = :client_id")
        params["client_id"] = client_id
    if estado:
        conditions.append("estado_proyecto = :estado")
        params["estado"] = estado
    if tipo:
        conditions.append("tipo_proyecto = :tipo")
        params["tipo"] = tipo

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM proyectos {where_clause}"),
        params
    )
    total = count_result.scalar()

    params["take"] = take
    params["skip"] = skip

    result = await db.execute(
        text(f"""
            SELECT * FROM proyectos
            {where_clause}
            ORDER BY created_at DESC
            LIMIT :take OFFSET :skip
        """),
        params
    )
    rows = result.fetchall()
    items = [dict(row._mapping) for row in rows]
    return {"total": total, "items": items}


# ─────────────────────────────────────────────
# GET /projects/{project_id} — Get project by ID
# ─────────────────────────────────────────────
@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single project by ID with all fields."""
    result = await db.execute(
        text("SELECT * FROM proyectos WHERE id = :id"),
        {"id": project_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return dict(row._mapping)


# ─────────────────────────────────────────────
# POST /projects — Create new project
# ─────────────────────────────────────────────
@router.post("", status_code=201, response_model=dict)
async def create_project(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Create a new project.
    All fields are optional except nombre_proyecto.
    Validates that cliente_id exists if provided.
    """
    if not payload.get("nombre_proyecto"):
        raise HTTPException(status_code=400, detail="nombre_proyecto is required")

    # Validate cliente_id if provided
    if payload.get("cliente_id"):
        check = await db.execute(
            text("SELECT id FROM clientes WHERE id = :id"),
            {"id": payload["cliente_id"]}
        )
        if not check.fetchone():
            raise HTTPException(status_code=400, detail=f"Cliente {payload['cliente_id']} not found")

    # Validate responsable_member_id if provided
    if payload.get("responsable_member_id"):
        check = await db.execute(
            text("SELECT id FROM miembros WHERE id = :id"),
            {"id": payload["responsable_member_id"]}
        )
        if not check.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Member {payload['responsable_member_id']} not found"
            )

    allowed_fields = [
        "codigo", "nombre_proyecto", "cliente_id", "responsable_member_id",
        "tipo_proyecto", "estado_proyecto", "prioridad_proyecto",
        "descripcion", "objetivo", "alcance",
        "fecha_inicio", "fecha_entrega_estimada", "fecha_cierre",
        "presupuesto_estimado", "origen", "external_id", "notas",
    ]

    field_names = []
    placeholders = []
    values = []

    for field in allowed_fields:
        if field in payload and payload[field] is not None:
            field_names.append(field)
            placeholders.append(f":{field}")
            values.append(payload[field])

    # Auto-generate codigo if not provided
    if "codigo" not in payload or not payload.get("codigo"):
        result = await db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM proyectos"))
        next_id = result.scalar()
        field_names.append("codigo")
        placeholders.append(":codigo")
        values.append(f"PROJ-{next_id:04d}")

    query = text(f"""
        INSERT INTO proyectos ({', '.join(field_names)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """)
    params = {field: val for field, val in zip(field_names, values)}

    result = await db.execute(query, params)
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)


# ─────────────────────────────────────────────
# PATCH /projects/{project_id} — Partial update
# ─────────────────────────────────────────────
@router.patch("/{project_id}", response_model=dict)
async def update_project(project_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    """Update project — only provided fields are updated (partial update)."""
    # Verify project exists
    check = await db.execute(text("SELECT id FROM proyectos WHERE id = :id"), {"id": project_id})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # Validate cliente_id if being changed
    if "cliente_id" in payload and payload["cliente_id"] is not None:
        check = await db.execute(
            text("SELECT id FROM clientes WHERE id = :id"),
            {"id": payload["cliente_id"]}
        )
        if not check.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Cliente {payload['cliente_id']} not found"
            )

    # Validate responsable_member_id if being changed
    if "responsable_member_id" in payload and payload["responsable_member_id"] is not None:
        check = await db.execute(
            text("SELECT id FROM miembros WHERE id = :id"),
            {"id": payload["responsable_member_id"]}
        )
        if not check.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Member {payload['responsable_member_id']} not found"
            )

    allowed_fields = [
        "codigo", "nombre_proyecto", "cliente_id", "responsable_member_id",
        "tipo_proyecto", "estado_proyecto", "prioridad_proyecto",
        "descripcion", "objetivo", "alcance",
        "fecha_inicio", "fecha_entrega_estimada", "fecha_cierre",
        "presupuesto_estimado", "origen", "external_id", "notas",
    ]

    set_clauses = []
    values = {}

    for field in allowed_fields:
        if field in payload:
            set_clauses.append(f"{field} = :{field}")
            values[field] = payload[field]

    if not set_clauses:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    values["id"] = project_id

    query = text(f"""
        UPDATE proyectos SET {', '.join(set_clauses)}, updated_at = NOW()
        WHERE id = :id
        RETURNING *
    """)

    result = await db.execute(query, values)
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)