"""Nexus orchestrator routes — direct task assignment from NEXUS."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta
import json

from app.database import get_db, get_async_connection
from app.schemas import (
    NexusAssignTaskPayload,
    TaskResponse,
    TaskCreate,
)
from app.routes.tasks import (
    resolve_member_code,
    generate_task_codigo,
    register_event,
    register_log,
)

router = APIRouter(prefix="/nexus", tags=["nexus"])


@router.post("/assign-task", response_model=TaskResponse, status_code=201)
async def nexus_assign_task(payload: NexusAssignTaskPayload, db: AsyncSession = Depends(get_db)):
    """
    Direct task assignment endpoint for NEXUS orchestrator.
    Creates a PENDIENTE task assigned to target_member_code.
    
    This is the preferred way for NEXUS to delegate work —
    it creates a properly structured task with full tracing.
    """
    # Resolve NEXUS as creator
    try:
        nexus_id = await resolve_member_code(db, "NEXUS")
    except HTTPException:
        try:
            nexus_id = await resolve_member_code(db, "HECTOR_1")
        except HTTPException:
            nexus_id = None

    # Resolve target member
    target_id = await resolve_member_code(db, payload.target_member_code)

    # Resolve responsible member (default NEXUS)
    responsible_id = None
    if payload.responsible_member_code:
        responsible_id = await resolve_member_code(db, payload.responsible_member_code)
    else:
        try:
            responsible_id = await resolve_member_code(db, "NEXUS")
        except HTTPException:
            pass

    # Resolve reviewer member (default NEXUS)
    reviewer_id = None
    if payload.reviewer_member_code:
        reviewer_id = await resolve_member_code(db, payload.reviewer_member_code)
    else:
        try:
            reviewer_id = await resolve_member_code(db, "NEXUS")
        except HTTPException:
            pass

    # Generate codigo
    codigo = await generate_task_codigo(db)

    # Insert task
    result = await db.execute(
        text("""
            INSERT INTO tasks (
                codigo, title, description, expected_output, acceptance_criteria,
                status, priority, task_type, client_id, project_id,
                assigned_member_id, responsible_member_id, reviewer_member_id,
                created_by_member_id, source, context_data, input_payload,
                visible_para_pm, requiere_aprobacion
            ) VALUES (
                :codigo, :title, :description, :expected_output, :acceptance_criteria,
                'PENDIENTE', :priority, :task_type, :client_id, :project_id,
                :assigned_id, :responsible_id, :reviewer_id, :nexus_id,
                'nexus', :context_data, :input_payload,
                TRUE, FALSE
            )
            RETURNING *
        """),
        {
            "codigo": codigo,
            "title": payload.title,
            "description": payload.description,
            "expected_output": payload.expected_output,
            "acceptance_criteria": payload.acceptance_criteria,
            "priority": payload.priority or 5,
            "task_type": payload.task_type or "IMPLEMENTACION",
            "client_id": payload.client_id,
            "project_id": payload.project_id,
            "assigned_id": target_id,
            "responsible_id": responsible_id,
            "reviewer_id": reviewer_id,
            "nexus_id": nexus_id,
            "context_data": json.dumps(payload.context_data) if payload.context_data else None,
            "input_payload": json.dumps(payload.input_payload) if payload.input_payload else None,
        }
    )
    task = dict(result.fetchone()._mapping)
    await db.commit()

    # Register events
    conn = await get_async_connection()
    try:
        await register_event(
            conn, task["id"], "TASK_CREATED", None, "PENDIENTE",
            f"Task created by NEXUS via /nexus/assign-task", nexus_id,
            {"title": payload.title, "target": payload.target_member_code}
        )
        await register_event(
            conn, task["id"], "TASK_ASSIGNED", None, "PENDIENTE",
            f"Assigned to {payload.target_member_code} by NEXUS", nexus_id,
            {"target": payload.target_member_code}
        )
        await register_log(
            conn, task["id"], nexus_id, "INFO",
            f"Task assigned via NEXUS orchestrator to {payload.target_member_code}",
            {"task_type": payload.task_type, "priority": payload.priority}
        )
        await conn.execute("COMMIT")
    finally:
        await conn.close()

    return task