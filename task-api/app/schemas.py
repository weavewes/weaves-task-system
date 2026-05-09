"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ─────────────────────────────────────────────
# Member Schemas
# ─────────────────────────────────────────────

class MemberBase(BaseModel):
    tipo_miembro: str
    codigo: str
    nombre: str
    nombre_visible: Optional[str] = None
    rol: Optional[str] = None
    area: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    telegram_username: Optional[str] = None
    mattermost_username: Optional[str] = None
    modelo: Optional[str] = None
    proveedor_modelo: Optional[str] = None
    endpoint_api: Optional[str] = None
    prompt_base: Optional[str] = None
    zona_horaria: Optional[str] = "America/Bogota"
    horario_laboral: Optional[str] = None
    disponibilidad_actual: Optional[str] = "DISPONIBLE"
    puede_recibir_tareas: Optional[bool] = True
    max_tareas_activas: Optional[int] = 5
    prioridad_asignacion: Optional[int] = 3
    estado: Optional[str] = "ACTIVO"
    habilidades: Optional[str] = None
    notas: Optional[str] = None


class MemberResponse(MemberBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberTaskResponse(BaseModel):
    """Member with their assigned tasks."""
    member: MemberResponse
    tasks: list["TaskResponse"]


# ─────────────────────────────────────────────
# Client Schemas
# ─────────────────────────────────────────────

class ClientBase(BaseModel):
    codigo: Optional[str] = None
    nombre_cliente: str
    razon_social: Optional[str] = None
    tipo_cliente: Optional[str] = "EMPRESA"
    email_principal: Optional[str] = None
    telefono_principal: Optional[str] = None
    whatsapp_principal: Optional[str] = None
    sitio_web: Optional[str] = None
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    estado_cliente: Optional[str] = "ACTIVO"
    prioridad: Optional[int] = 3
    origen: Optional[str] = None
    notas: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Project Schemas
# ─────────────────────────────────────────────

class ProjectBase(BaseModel):
    codigo: Optional[str] = None
    nombre_proyecto: str
    cliente_id: Optional[int] = None
    responsable_member_id: Optional[int] = None
    tipo_proyecto: Optional[str] = "CLIENTE"
    estado_proyecto: Optional[str] = "ACTIVO"
    prioridad_proyecto: Optional[str] = "MEDIA"
    descripcion: Optional[str] = None
    objetivo: Optional[str] = None
    alcance: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_entrega_estimada: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    presupuesto_estimado: Optional[float] = None
    origen: Optional[str] = None
    external_id: Optional[str] = None
    notas: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Task Schemas
# ─────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str
    expected_output: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    status: Optional[str] = "PENDIENTE"
    priority: Optional[int] = 3
    task_type: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_member_code: Optional[str] = None
    responsible_member_code: Optional[str] = None
    reviewer_member_code: Optional[str] = None
    created_by_member_code: Optional[str] = None
    source: Optional[str] = None
    context_data: Optional[dict[str, Any]] = None
    input_payload: Optional[dict[str, Any]] = None


class TaskResponse(BaseModel):
    id: int
    codigo: Optional[str] = None
    title: str
    description: str
    expected_output: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    status: str
    priority: int
    task_type: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_member_id: Optional[int] = None
    responsible_member_id: Optional[int] = None
    reviewer_member_id: Optional[int] = None
    created_by_member_id: Optional[int] = None
    worker_id: Optional[str] = None
    claimed_at: Optional[datetime] = None
    lease_expires_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    visible_para_pm: Optional[bool] = True
    requiere_aprobacion: Optional[bool] = False
    bloqueada_por: Optional[str] = None
    motivo_bloqueo: Optional[str] = None
    fecha_ultimo_seguimiento: Optional[datetime] = None
    proxima_accion: Optional[str] = None
    source: Optional[str] = None
    external_id: Optional[str] = None
    context_data: Optional[dict[str, Any]] = None
    input_payload: Optional[dict[str, Any]] = None
    result_payload: Optional[dict[str, Any]] = None
    agent_notes: Optional[str] = None
    human_notes: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = 0
    max_retries: Optional[int] = 3
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskDetailResponse(TaskResponse):
    """Task with related entity info (client, project, members)."""
    client: Optional[ClientResponse] = None
    project: Optional[ProjectResponse] = None
    assigned_member: Optional[MemberResponse] = None
    responsible_member: Optional[MemberResponse] = None
    reviewer_member: Optional[MemberResponse] = None
    created_by_member: Optional[MemberResponse] = None


# ─────────────────────────────────────────────
# Task Events & Logs
# ─────────────────────────────────────────────

class TaskEventResponse(BaseModel):
    id: int
    task_id: int
    event_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    message: Optional[str] = None
    created_by_member_id: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TaskLogCreate(BaseModel):
    member_code: str
    log_level: Optional[str] = "INFO"
    message: str
    metadata: Optional[dict[str, Any]] = None


class TaskLogResponse(BaseModel):
    id: int
    task_id: int
    member_id: Optional[int] = None
    log_level: str
    message: str
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Action Payloads
# ─────────────────────────────────────────────

class ClaimNextPayload(BaseModel):
    member_code: str
    worker_id: str
    lease_minutes: int = 15
    include_dependency_outputs: bool = False


class HeartbeatPayload(BaseModel):
    member_code: str
    worker_id: str
    lease_minutes: int = 15
    message: Optional[str] = "Heartbeat"


class CompletePayload(BaseModel):
    member_code: str
    worker_id: str
    agent_notes: Optional[str] = None
    result_payload: Optional[dict[str, Any]] = None


class FailPayload(BaseModel):
    member_code: str
    worker_id: str
    error_message: str
    agent_notes: Optional[str] = None
    next_status: str = "ERROR"


class RequeueExpiredPayload(BaseModel):
    max_requeues: int = 20


class RequeueResponse(BaseModel):
    requeued: int
    expired: int
    message: str


# ─────────────────────────────────────────────
# Nexus Assign Task Payload
# ─────────────────────────────────────────────

class NexusAssignTaskPayload(BaseModel):
    target_member_code: str
    responsible_member_code: Optional[str] = None
    reviewer_member_code: Optional[str] = None
    project_id: Optional[int] = None
    title: str
    description: str
    expected_output: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    priority: Optional[int] = 5
    task_type: Optional[str] = "IMPLEMENTACION"
    client_id: Optional[int] = None
    context_data: Optional[dict[str, Any]] = None
    input_payload: Optional[dict[str, Any]] = None


# ─────────────────────────────────────────────
# List Response Wrappers
# ─────────────────────────────────────────────

class MemberListResponse(BaseModel):
    total: int
    members: list[MemberResponse]


class TaskListResponse(BaseModel):
    total: int
    items: list[TaskResponse]


class EventListResponse(BaseModel):
    task_id: int
    events: list[TaskEventResponse]


class LogListResponse(BaseModel):
    task_id: int
    logs: list[TaskLogResponse]


class TaskChainItem(BaseModel):
    title: str
    assigned_member_code: str
    task_type: Optional[str] = "IMPLEMENTACION"
    priority: Optional[int] = 5


class TaskChainPayload(BaseModel):
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    created_by_member_code: Optional[str] = "NEXUS"
    tasks: list[TaskChainItem]


class TaskChainResponse(BaseModel):
    total: int
    tasks: list[TaskResponse]
    dependencies: list[dict]


class TaskDependencyResponse(BaseModel):
    id: int
    task_id: int
    depends_on_task_id: int
    dependency_type: str
    is_required: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TaskDependencyListResponse(BaseModel):
    task_id: int
    dependencies: list[TaskDependencyResponse]


# ─────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str
    version: Optional[str] = "1.0.0"


# ─────────────────────────────────────────────
# Task Outputs
# ─────────────────────────────────────────────

class TaskOutputCreate(BaseModel):
    member_code: str
    output_type: str = "TEXT"
    title: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class TaskOutputResponse(BaseModel):
    id: int
    task_id: int
    created_by_member_id: Optional[int] = None
    output_type: str
    title: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TaskOutputListResponse(BaseModel):
    task_id: int
    outputs: list[TaskOutputResponse]


class DependencyOutputItem(BaseModel):
    id: int
    source_task_id: int
    source_task_title: str
    created_by: str
    output_type: str
    title: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime


class ClaimNextResponse(BaseModel):
    claimed: bool
    message: Optional[str] = None
    task: Optional[TaskResponse] = None
    dependency_outputs: Optional[list[DependencyOutputItem]] = None