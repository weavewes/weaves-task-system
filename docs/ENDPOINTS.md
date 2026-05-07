# Task API Endpoints

Base URL: `http://localhost:8000` (local) or `http://<server>:8000` (remote)

---

## 1. GET /health

Health check.

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "weaves-task-api",
  "version": "1.0.0"
}
```

---

## 2. GET /members

List all active members.

```bash
curl http://localhost:8000/members
```

**Response:**
```json
{
  "total": 12,
  "members": [
    {
      "id": 1,
      "codigo": "HECTOR_1",
      "nombre": "Hector",
      "area": "DIRECCION",
      ...
    }
  ]
}
```

---

## 3. GET /members/code/{codigo}

Get a single member by code.

```bash
curl http://localhost:8000/members/code/FORGE_4
```

**Response:**
```json
{
  "id": 4,
  "codigo": "FORGE_4",
  "nombre": "FORGE",
  "nombre_visible": "FORGE 🔧",
  "rol": "Chief Technology Officer",
  "area": "INTELIGENCIA_ARTIFICIAL",
  ...
}
```

---

## 4. GET /members/code/{codigo}/tasks

Get tasks for a member filtered by role.

```bash
# All tasks where FORGE has any role
curl "http://localhost:8000/members/code/FORGE_4/tasks"

# Only tasks assigned to FORGE
curl "http://localhost:8000/members/code/FORGE_4/tasks?role=assigned"

# Only tasks with status PENDIENTE
curl "http://localhost:8000/members/code/FORGE_4/tasks?role=assigned&status=PENDIENTE"

# Tasks created by FORGE
curl "http://localhost:8000/members/code/FORGE_4/tasks?role=created_by"
```

**Roles:** `assigned`, `responsible`, `reviewer`, `created_by`, `all` (default)

---

## 5. POST /tasks

Create a new task. Accepts member codes in the payload.

```bash
curl -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Crear endpoint claim-next",
    "description": "Implementar el endpoint atomico para reclamar tareas.",
    "expected_output": "Endpoint funcional con FOR UPDATE SKIP LOCKED",
    "acceptance_criteria": "Cambia PENDIENTE a EN_PROGRESO con lease",
    "status": "PENDIENTE",
    "priority": 5,
    "task_type": "IMPLEMENTACION",
    "project_id": 1,
    "assigned_member_code": "FORGE_4",
    "responsible_member_code": "NEXUS",
    "reviewer_member_code": "NEXUS",
    "source": "nexus",
    "context_data": {"stack": "FastAPI + PostgreSQL"},
    "input_payload": {"requested_by": "NEXUS"}
  }'
```

**Response:** Full task object with generated `codigo` (e.g. `TASK-0010`) and IDs.

---

## 6. GET /tasks

List tasks with filters.

```bash
# All tasks
curl "http://localhost:8000/tasks"

# Only PENDIENTE tasks
curl "http://localhost:8000/tasks?status=PENDIENTE"

# Tasks for project 1 with priority >= 4
curl "http://localhost:8000/tasks?project_id=1&priority_min=4"

# Tasks assigned to FORGE
curl "http://localhost:8000/tasks?assigned_member_code=FORGE_4"

# Pagination
curl "http://localhost:8000/tasks?skip=0&take=10"
```

---

## 7. GET /tasks/{task_id}

Get a single task with full related info.

```bash
curl http://localhost:8000/tasks/1
```

**Response includes:** task fields + `client`, `project`, `assigned_member`, `responsible_member`, `reviewer_member`, `created_by_member`.

---

## 8. POST /tasks/claim-next ⭐ CRITICAL

Atomically claim the next highest-priority PENDIENTE task assigned to the member.

```bash
curl -X POST http://localhost:8000/tasks/claim-next \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "lease_minutes": 15
  }'
```

**If a task is claimed:**
```json
{
  "claimed": true,
  "task": {
    "id": 10,
    "codigo": "TASK-0010",
    "status": "EN_PROGRESO",
    "worker_id": "FORGE-local",
    "lease_expires_at": "2026-05-07T14:16:00",
    ...
  }
}
```

**If no task available:**
```json
{
  "claimed": false,
  "message": "No hay tareas pendientes para FORGE_4."
}
```

---

## 9. POST /tasks/{task_id}/heartbeat

Extend the lease on an in-progress task.

```bash
curl -X POST http://localhost:8000/tasks/10/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "lease_minutes": 15,
    "message": "Sigo trabajando en el endpoint."
  }'
```

---

## 10. POST /tasks/{task_id}/complete

Complete a task.

```bash
curl -X POST http://localhost:8000/tasks/10/complete \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "agent_notes": "Implementacion completada.",
    "result_payload": {"endpoints_added": ["POST /tasks/claim-next"]}
  }'
```

- If `requiere_aprobacion=true` → status becomes `EN_REVISION`
- Otherwise → status becomes `COMPLETADA`

---

## 11. POST /tasks/{task_id}/fail

Mark a task as failed/blocked.

```bash
curl -X POST http://localhost:8000/tasks/10/fail \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "error_message": "Falta acceso al repositorio.",
    "agent_notes": "Se requiere intervencion de NEXUS.",
    "next_status": "ESPERANDO_HUMANO"
  }'
```

**Valid `next_status`:** `ERROR`, `BLOQUEADA`, `ESPERANDO_HUMANO`, `ESPERANDO_CLIENTE`

- `ERROR` → increments `retry_count`
- Others → no retry increment

---

## 12. POST /tasks/requeue-expired

Requeue tasks with expired leases.

```bash
curl -X POST http://localhost:8000/tasks/requeue-expired \
  -H "Content-Type: application/json" \
  -d '{"max_requeues": 20}'
```

**Response:**
```json
{
  "requeued": 2,
  "expired": 0,
  "message": "Requeued 2 tasks, 0 marked ERROR (max retries)."
}
```

---

## 13. GET /tasks/{task_id}/events

Get the event history for a task.

```bash
curl http://localhost:8000/tasks/10/events
```

**Response:**
```json
{
  "task_id": 10,
  "events": [
    {
      "id": 1,
      "event_type": "TASK_CREATED",
      "old_status": null,
      "new_status": "PENDIENTE",
      "message": "Task TASK-0010 created",
      "created_at": "2026-05-07T14:00:00"
    },
    {
      "id": 2,
      "event_type": "TASK_CLAIMED",
      "old_status": "PENDIENTE",
      "new_status": "EN_PROGRESO",
      "message": "Task claimed by FORGE_4",
      "created_at": "2026-05-07T14:01:00"
    }
  ]
}
```

---

## 14. GET /tasks/{task_id}/logs

Get the log entries for a task.

```bash
curl http://localhost:8000/tasks/10/logs
```

---

## 15. POST /tasks/{task_id}/logs

Add a log entry to a task.

```bash
curl -X POST http://localhost:8000/tasks/10/logs \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "log_level": "INFO",
    "message": "Iniciando implementacion del endpoint.",
    "metadata": {"step": "start"}
  }'
```

---

## 16. POST /nexus/assign-task ⭐

Direct task assignment for NEXUS orchestrator.

```bash
curl -X POST http://localhost:8000/nexus/assign-task \
  -H "Content-Type: application/json" \
  -d '{
    "target_member_code": "FORGE_4",
    "responsible_member_code": "NEXUS",
    "reviewer_member_code": "NEXUS",
    "project_id": 1,
    "title": "Implementar endpoint claim-next",
    "description": "Crear el endpoint atomico para que agentes reclamen tareas.",
    "expected_output": "Endpoint funcional con FOR UPDATE SKIP LOCKED",
    "acceptance_criteria": "Cambia PENDIENTE a EN_PROGRESO con lease de 15min",
    "priority": 5,
    "task_type": "IMPLEMENTACION",
    "context_data": {"stack": "FastAPI + PostgreSQL"}
  }'
```

Creates a `PENDIENTE` task and registers `TASK_CREATED` + `TASK_ASSIGNED` events automatically.

---

## Quick Test Script

```bash
#!/bin/bash
API="http://localhost:8000"

echo "=== 1. Health ==="
curl -s $API/health | jq .

echo "=== 2. List members ==="
curl -s $API/members | jq '.total'

echo "=== 3. Create task ==="
TASK=$(curl -s -X POST $API/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task for FORGE",
    "description": "Testing claim-next flow",
    "priority": 5,
    "task_type": "IMPLEMENTACION",
    "project_id": 1,
    "assigned_member_code": "FORGE_4",
    "created_by_member_code": "HECTOR_1"
  }')
echo $TASK | jq .
TASK_ID=$(echo $TASK | jq '.id')

echo "=== 4. Claim task ==="
curl -s -X POST $API/tasks/claim-next \
  -H "Content-Type: application/json" \
  -d '{"member_code": "FORGE_4", "worker_id": "FORGE-local", "lease_minutes": 15}' | jq .

echo "=== 5. Heartbeat ==="
curl -s -X POST $API/tasks/$TASK_ID/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"member_code": "FORGE_4", "worker_id": "FORGE-local", "lease_minutes": 15}' | jq '.status'

echo "=== 6. Complete task ==="
curl -s -X POST $API/tasks/$TASK_ID/complete \
  -H "Content-Type: application/json" \
  -d '{"member_code": "FORGE_4", "worker_id": "FORGE-local", "agent_notes": "Test complete"}' | jq '.status'

echo "=== 7. Events ==="
curl -s $API/tasks/$TASK_ID/events | jq '.[].event_type'
```