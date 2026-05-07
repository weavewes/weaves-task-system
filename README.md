# Weaves Task System — PostgreSQL Local

Sistema de gestión de tareas, proyectos y clientes basado en PostgreSQL + Adminer.

---

## 🐙 Descripción

Sistema liviano de base de datos local para gestionar el flujo de trabajo del ecosistema Weaves. Reemplaza la necesidad de servicios externos como Teable/Plane para tareas básicas.

---

## 🏗️ Arquitectura

| Contenedor | Imagen | Puerto | Propósito |
|------------|--------|--------|-----------|
| `weaves_task_postgres` | postgres:16 | 5433 | Base de datos PostgreSQL |
| `weaves_task_adminer` | adminer:latest | 8085 | GUI web para administración de BD |

---

## 🔐 Credenciales

> ⚠️ **Cambiar la contraseña en `.env` antes de producción.**

| Variable | Valor |
|----------|-------|
| Database | `weaves_tasks` |
| User | `weaves` |
| Password | `Cambia_Esta_Clave_Segura_2026` |
| PostgreSQL Port | `5433` |
| Adminer Port | `8085` |

---

## 📦 Schema de Base de Datos

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `clientes` | Registro de clientes |
| `proyectos` | Proyectos vinculados a clientes |
| `tareas` | Tareas vinculadas a proyectos |
| `team_members` | Miembros del equipo (humanos y agentes IA) |

### Relaciones

```
clientes (1) ──→ (N) proyectos
proyectos (1) ──→ (N) tareas
```

---

## 🚀 Comandos Útiles

### Levantar el sistema
```bash
cd ~/weaves-task-system
docker compose up -d
```

### Ver estado de contenedores
```bash
docker ps --filter name=weaves_task
```

### Detener el sistema
```bash
cd ~/weaves-task-system
docker compose down
```

### Detener y eliminar datos
```bash
docker compose down -v
```

### Ver logs
```bash
docker logs weaves_task_postgres
docker logs weaves_task_adminer
```

### Reiniciar PostgreSQL
```bash
docker restart weaves_task_postgres
```

### Conectar a PostgreSQL (CLI)
```bash
docker exec -i weaves_task_postgres psql -U weaves -d weaves_tasks
```

---

## 🌐 Adminer — Interfaz Web

**URL:** http://localhost:8085

| Campo | Valor |
|-------|-------|
| Motor | PostgreSQL |
| Servidor | `weaves_task_postgres` |
| Usuario | `weaves` |
| Contraseña | `Cambia_Esta_Clave_Segura_2026` |
| Base de datos | `weaves_tasks` |

---

## 🔧 Comandos SQL Comunes

### Ver todas las tablas
```sql
\dt
```

### Ver estructura de una tabla
```sql
\d clientes
```

### Insertar cliente
```sql
INSERT INTO clientes (etiqueta, nombre_del_cliente, email, empresa, numero_de_telefono, notas)
VALUES ('CLI-0001', 'Nombre Apellido', 'email@example.com', 'Empresa', '+57 300 123 4567', 'Notas');
```

### Ver proyectos de un cliente
```sql
SELECT p.* FROM proyectos p WHERE p.cliente_id = 1;
```

### Ver tareas de un proyecto
```sql
SELECT * FROM tareas WHERE proyecto_id = 1;
```

### Actualizar estado de tarea
```sql
UPDATE tareas SET estado_tarea = 'COMPLETADA', updated_at = NOW() WHERE id = 1;
```

---

## 📁 Estructura de Archivos

```
~/weaves-task-system/
├── .env              # Variables de entorno (credenciales)
├── docker-compose.yml # Definición de servicios
├── init.sql          # Schema inicial de base de datos
└── README.md         # Este archivo
```

---

## 🔄 Integración con Task API

Este PostgreSQL es la base del nuevo sistema de tareas. La Task API existente (`http://192.168.0.22:8002`) puede consultar este PostgreSQL como backend.

### Endpoints de conexión

| Servicio | Host | Puerto |
|----------|------|--------|
| PostgreSQL | `localhost` | `5433` |
| Adminer | `localhost` | `8085` |

---

## 📋 Team Members Insertados

| ID | Nombre | Tipo |
|----|--------|------|
| 1 | Hector | HUMANO |
| 2 | YOA | AGENTE_IA |
| 3 | AURA | AGENTE_IA |
| 4 | FORGE | AGENTE_IA |
| 5 | FLUX | AGENTE_IA |
| 6 | PRISMA | AGENTE_IA |
| 7 | LINK | AGENTE_IA |
| 8 | TEKTON | AGENTE_IA |
| 9 | Rosana Vilar | EXTERNO |
| 10 | Jose Valderrama | EXTERNO |
| 11 | Luis Rosales | EXTERNO |
| 12 | Michelle | EXTERNO |

---

**Creado:** 2026-05-07  
**Proyecto:** iSwift (primer proyecto en nueva arquitectura PostgreSQL local)
