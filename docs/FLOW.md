# Task API — Complete Flow

This document explains the full task lifecycle and how the API supports it.

---

## Overview

The Weaves Task System is designed for **agent orchestration**: multiple AI agents claim, execute, and complete tasks through a safe, atomic interface.

**Core principle:** No agent writes directly to PostgreSQL. All operations go through the Task API.

---

## Task Lifecycle

```
                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
                    ▼                                                     │
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐
│ PENDIENTE │───▶│EN_PROGRESO│───▶│ COMPLETADA  │    │ EN_REVISION │───▶│ COMPLETADA │
└──────────┘    └──────────┘    └──────────────┘    └─────────────┘    └───────────┘
     │               │                                   ▲
     │               │                                   │
     │          lease expires                       approval
     │               │                                   │
     │               ▼                               given
     │          (requeue or ERROR)
     │               │
     │               ▼
     │          ┌─────────────┐
     └─────────▶│ BLOQUEADA   │──▶ ESPERANDO_HUMANO / ESPERANDO_CLIENTE
                │   ERROR     │
                └─────────────┘
```

### Status Definitions

| Status | Meaning |
|--------|---------|
| `PENDIENTE` | Waiting to be claimed |
| `EN_PROGRESO` | Claimed and being worked on |
| `EN_REVISION` | Completed, awaiting approval |
| `COMPLETADA` | Done |
| `ERROR` | Failed after max retries |
| `BLOQUEADA` | Blocked |
| `ESPERANDO_HUMANO` | Waiting for human intervention |
| `ESPERANDO_CLIENTE` | Waiting for client input |
| `CANCELADA` | Cancelled |

---

## The 5-Step Agent Flow

### Step 1: NEXUS Creates the Task

NEXUS (orchestrator) assigns work via `POST /nexus/assign-task`:

```bash
curl -X POST http://localhost:8000/nexus/assign-task \
  -H "Content-Type: application/json" \
  -d '{
    "target_member_code": "FORGE_4",
    "title": "Implementar endpoint /tasks/claim-next",
    "description": "...",
    "priority": 5,
    "task_type": "IMPLEMENTACION",
    "project_id": 1
  }'
```

**What happens:**
1. Task is created with status `PENDIENTE`
2. Task is assigned to `FORGE_4`
3. `TASK_CREATED` event is registered
4. `TASK_ASSIGNED` event is registered
5. Log entry is created

---

### Step 2: FORGE Claims the Task

FORGE requests the next task via `POST /tasks/claim-next`:

```bash
curl -X POST http://localhost:8000/tasks/claim-next \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "lease_minutes": 15
  }'
```

**Atomic operation (FOR UPDATE SKIP LOCKED):**
1. Finds the highest-priority `PENDIENTE` task assigned to FORGE
2. Locks the row (other FORGE agents skip it)
3. Updates status → `EN_PROGRESO`
4. Sets `worker_id`, `claimed_at`, `started_at`, `lease_expires_at`
5. Registers `TASK_CLAIMED` event + log

**Result:**
- If a task is available → `claimed: true` with task object
- If none → `claimed: false` with message

**Lease system:** The task is locked for `lease_minutes`. If the agent doesn't send a heartbeat before expiry, the task is automatically requeued by `/tasks/requeue-expired`.

---

### Step 3: FORGE Sends Heartbeats

While working, FORGE extends the lease:

```bash
curl -X POST http://localhost:8000/tasks/10/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "lease_minutes": 15,
    "message": "Seguimos trabajando."
  }'
```

**What happens:**
1. Verifies `worker_id` matches (security)
2. Extends `lease_expires_at`
3. Registers `TASK_HEARTBEAT` event + log

**Best practice:** Send heartbeat every ~5-7 minutes for a 15-minute lease.

---

### Step 4: FORGE Completes the Task

```bash
curl -X POST http://localhost:8000/tasks/10/complete \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "agent_notes": "Implementacion terminada. Todos los endpoints verificados.",
    "result_payload": {
      "endpoints_added": ["claim-next", "heartbeat", "complete"],
      "tests_passed": 5
    }
  }'
```

**What happens:**
- If `requiere_aprobacion = false` → status becomes `COMPLETADA`
- If `requiere_aprobacion = true` → status becomes `EN_REVISION`
- `worker_id` and `lease_expires_at` are cleared
- `TASK_COMPLETED` or `TASK_READY_FOR_REVIEW` event registered
- Log entry with `result_payload` stored

---

### Step 5 (Failure Path): FORGE Reports a Problem

```bash
curl -X POST http://localhost:8000/tasks/10/fail \
  -H "Content-Type: application/json" \
  -d '{
    "member_code": "FORGE_4",
    "worker_id": "FORGE-local",
    "error_message": "Falta acceso al repositorio GitHub.",
    "agent_notes": "Se requiere intervencion de NEXUS o HECTOR.",
    "next_status": "ESPERANDO_HUMANO"
  }'
```

**What happens:**
- Status changes to the specified `next_status`
- If `next_status = ERROR` → `retry_count` is incremented
- If `next_status = ESPERANDO_HUMANO/BLOQUEADA/ESPERANDO_CLIENTE` → no retry increment
- `worker_id` and `lease_expires_at` cleared
- Event registered: `TASK_FAILED` or `TASK_BLOCKED`

---

## Requeue Expired (Automatic Cleanup)

The `/tasks/requeue-expired` endpoint should be called periodically (e.g., every minute via cron):

```bash
curl -X POST http://localhost:8000/tasks/requeue-expired \
  -H "Content-Type: application/json" \
  -d '{"max_requeues": 20}'
```

**Logic:**
1. Find all `EN_PROGRESO` tasks where `lease_expires_at < NOW()`
2. For each: if `retry_count < max_requeues` → back to `PENDIENTE` (requeued)
3. Otherwise → status becomes `ERROR`

---

## Audit Trail

Every state change is recorded:

### task_events
- `TASK_CREATED` — when task is first created
- `TASK_ASSIGNED` — when task is assigned to a member
- `TASK_CLAIMED` — when an agent claims the task
- `TASK_HEARTBEAT` — when lease is extended
- `TASK_COMPLETED` — when completed without approval
- `TASK_READY_FOR_REVIEW` — when completed with approval required
- `TASK_FAILED` — when failed (ERROR status)
- `TASK_BLOCKED` — when blocked or waiting
- `TASK_REQUEUED` — when requeued after lease expiry

### task_logs
Technical log entries with levels: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

---

## Key Design Decisions

1. **Atomic claim** — `FOR UPDATE SKIP LOCKED` prevents two agents from claiming the same task simultaneously.

2. **Lease system** — Prevents zombie tasks. If an agent dies, the task is requeued after the lease expires.

3. **Codes not IDs in payloads** — Agents use human-readable codes (FORGE_4, YOA_2) in API calls. The API resolves them to IDs internally.

4. **No deletes** — Tasks are never deleted, only have their status changed.

5. **JSONB for flexible data** — `context_data`, `input_payload`, `result_payload`, and `metadata` fields use JSONB for flexible, schema-less data.

6. **NEXUS owns task creation** — The `/nexus/assign-task` endpoint is the official way to create tasks. Direct `/tasks` POST is for special cases.

---

## Multi-Agent Concurrency

The system supports multiple agents of the same type (e.g., two FORGE instances):

- Each agent uses a unique `worker_id` (e.g., `FORGE-local`, `FORGE-server-2`)
- Heartbeat and complete require the correct `worker_id`
- `FOR UPDATE SKIP LOCKED` ensures only one agent can claim a given task

---

## Running the Stack

```bash
cd ~/weaves-task-system

# Start all services
docker-compose up --build -d

# Check logs
docker-compose logs -f task-api

# Check health
curl http://localhost:8000/health

# Stop
docker-compose down
```

**Ports:**
- Task API: `8000`
- Adminer (DB GUI): `8085`
- PostgreSQL: `5433` (external), `5432` (inside Docker network)