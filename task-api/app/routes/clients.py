"""Client routes — CRUD operations for clients."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Any
from datetime import datetime

from app.database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])


# ─────────────────────────────────────────────
# GET /clients — List all clients
# ─────────────────────────────────────────────
@router.get("", response_model=dict)
async def list_clients(
    estado: Optional[str] = Query(None, description="Filter by estado_cliente"),
    skip: int = Query(0, ge=0),
    take: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all clients with optional filter by estado."""
    where_clause = "WHERE estado_cliente = :estado" if estado else ""
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM clientes {where_clause}"),
        {"estado": estado} if estado else {}
    )
    total = count_result.scalar()

    result = await db.execute(
        text(f"""
            SELECT * FROM clientes
            {where_clause}
            ORDER BY created_at DESC
            LIMIT :take OFFSET :skip
        """),
        {"take": take, "skip": skip, "estado": estado} if estado else {"take": take, "skip": skip}
    )
    rows = result.fetchall()
    items = [dict(row._mapping) for row in rows]
    return {"total": total, "items": items}


# ─────────────────────────────────────────────
# GET /clients/{client_id} — Get client by ID
# ─────────────────────────────────────────────
@router.get("/{client_id}", response_model=dict)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single client by ID with all fields."""
    result = await db.execute(
        text("SELECT * FROM clientes WHERE id = :id"),
        {"id": client_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")
    return dict(row._mapping)


# ─────────────────────────────────────────────
# POST /clients — Create new client
# ─────────────────────────────────────────────
@router.post("", status_code=201, response_model=dict)
async def create_client(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Create a new client.
    All fields are optional except nombre_cliente.
    Generates codigo automatically if not provided.
    """
    # Validate required field
    if not payload.get("nombre_cliente"):
        raise HTTPException(status_code=400, detail="nombre_cliente is required")

    # Build dynamic INSERT
    allowed_fields = [
        "codigo", "nombre_cliente", "razon_social", "tipo_cliente",
        "email_principal", "telefono_principal", "whatsapp_principal",
        "sitio_web", "pais", "ciudad", "estado_cliente", "prioridad",
        "origen", "notas",
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
        result = await db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM clientes"))
        next_id = result.scalar()
        field_names.append("codigo")
        placeholders.append(":codigo")
        values.append(f"CLI-{next_id:04d}")

    query = text(f"""
        INSERT INTO clientes ({', '.join(field_names)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """)
    params = {field: val for field, val in zip(field_names, values)}

    result = await db.execute(query, params)
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)


# ─────────────────────────────────────────────
# PATCH /clients/{client_id} — Partial update
# ─────────────────────────────────────────────
@router.patch("/{client_id}", response_model=dict)
async def update_client(client_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    """Update client — only provided fields are updated (partial update)."""
    # Verify client exists
    check = await db.execute(text("SELECT id FROM clientes WHERE id = :id"), {"id": client_id})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    allowed_fields = [
        "codigo", "nombre_cliente", "razon_social", "tipo_cliente",
        "email_principal", "telefono_principal", "whatsapp_principal",
        "sitio_web", "pais", "ciudad", "estado_cliente", "prioridad",
        "origen", "notas",
    ]

    set_clauses = []
    values = {}

    for field in allowed_fields:
        if field in payload:
            set_clauses.append(f"{field} = :{field}")
            values[field] = payload[field]

    if not set_clauses:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    values["id"] = client_id

    query = text(f"""
        UPDATE clientes SET {', '.join(set_clauses)}, updated_at = NOW()
        WHERE id = :id
        RETURNING *
    """)

    result = await db.execute(query, values)
    row = result.fetchone()
    await db.commit()
    return dict(row._mapping)