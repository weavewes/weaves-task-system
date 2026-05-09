-- ================================================
-- WEAVES TASK SYSTEM - Schema de Base de Datos
-- Versión: 3.3 (2026-05-08) — task_outputs added
-- ================================================

-- Tabla de clientes (v2.1)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre_cliente VARCHAR(255) NOT NULL,
    razon_social VARCHAR(255),
    tipo_cliente VARCHAR(50) DEFAULT 'EMPRESA',
    email_principal VARCHAR(255),
    telefono_principal VARCHAR(50),
    whatsapp_principal VARCHAR(50),
    sitio_web VARCHAR(255),
    pais VARCHAR(100),
    ciudad VARCHAR(100),
    estado_cliente VARCHAR(50) DEFAULT 'ACTIVO',
    prioridad INTEGER DEFAULT 3,
    origen VARCHAR(100),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_tipo_cliente CHECK (tipo_cliente IN ('EMPRESA', 'PERSONA', 'INTERNO', 'PROSPECTO')),
    CONSTRAINT valid_estado_cliente CHECK (estado_cliente IN ('ACTIVO', 'INACTIVO', 'PROSPECTO', 'PAUSADO', 'FINALIZADO'))
);

-- Tabla de proyectos (v2.2)
CREATE TABLE proyectos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    nombre_proyecto VARCHAR(255) NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    responsable_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    tipo_proyecto VARCHAR(50) DEFAULT 'CLIENTE',
    estado_proyecto VARCHAR(50) DEFAULT 'ACTIVO',
    prioridad_proyecto VARCHAR(50) DEFAULT 'MEDIA',
    descripcion TEXT,
    objetivo TEXT,
    alcance TEXT,
    fecha_inicio DATE,
    fecha_entrega_estimada DATE,
    fecha_cierre DATE,
    presupuesto_estimado NUMERIC(12,2),
    origen VARCHAR(100),
    external_id VARCHAR(150),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_tipo_proyecto CHECK (tipo_proyecto IN ('WEB', 'AUTOMATIZACION', 'SEO', 'SOPORTE', 'DISEÑO', 'CONTENIDO', 'CONSULTORIA', 'INTERNO', 'PRODUCTO', 'INFRAESTRUCTURA', 'CLIENTE')),
    CONSTRAINT valid_estado_proyecto CHECK (estado_proyecto IN ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'PAUSADO', 'EN_REVISION', 'COMPLETADO', 'CANCELADO')),
    CONSTRAINT valid_prioridad_proyecto CHECK (prioridad_proyecto IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA'))
);

-- Tabla de tasks (v3.0)
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    expected_output TEXT,
    acceptance_criteria TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    priority INTEGER NOT NULL DEFAULT 3,
    task_type VARCHAR(50),
    client_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES proyectos(id) ON DELETE SET NULL,
    assigned_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    responsible_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    reviewer_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    created_by_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    worker_id VARCHAR(100),
    claimed_at TIMESTAMP,
    lease_expires_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    visible_para_pm BOOLEAN DEFAULT TRUE,
    requiere_aprobacion BOOLEAN DEFAULT FALSE,
    bloqueada_por VARCHAR(150),
    motivo_bloqueo TEXT,
    blocked_reason TEXT,
    fecha_ultimo_seguimiento TIMESTAMP,
    proxima_accion TEXT,
    source VARCHAR(100),
    external_id VARCHAR(150),
    context_data JSONB,
    input_payload JSONB,
    result_payload JSONB,
    agent_notes TEXT,
    human_notes TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_task_status CHECK (status IN ('PENDIENTE', 'EN_PROGRESO', 'ESPERANDO_HUMANO', 'ESPERANDO_CLIENTE', 'BLOQUEADA', 'EN_REVISION', 'COMPLETADA', 'ERROR', 'CANCELADA')),
    CONSTRAINT valid_task_type CHECK (task_type IS NULL OR task_type IN ('ANALISIS', 'IMPLEMENTACION', 'REVISION', 'CONTACTO_CLIENTE', 'DOCUMENTACION', 'SOPORTE', 'DISEÑO', 'CONTENIDO', 'AUTOMATIZACION', 'INFRAESTRUCTURA', 'SEGUIMIENTO'))
);

-- Tabla de eventos de tareas (v1.0)
CREATE TABLE task_events (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    message TEXT,
    created_by_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de dependencias entre tareas (v1.0)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'FINISH_TO_START',
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_dependency CHECK (task_id <> depends_on_task_id),
    CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'BLOCKS')),
    CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);

-- Tabla de logs de tareas (v1.0)
CREATE TABLE task_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    log_level VARCHAR(50) DEFAULT 'INFO',
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_task_log_level CHECK (log_level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- Tabla de miembros del equipo (v2.0)
CREATE TABLE miembros (
    id SERIAL PRIMARY KEY,
    tipo_miembro VARCHAR(50) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    nombre_visible VARCHAR(200),
    rol VARCHAR(150),
    area VARCHAR(100),
    descripcion TEXT,
    email VARCHAR(200),
    telefono VARCHAR(50),
    whatsapp VARCHAR(50),
    telegram_username VARCHAR(100),
    mattermost_username VARCHAR(100),
    modelo VARCHAR(150),
    proveedor_modelo VARCHAR(100),
    endpoint_api TEXT,
    prompt_base TEXT,
    zona_horaria VARCHAR(100) DEFAULT 'America/Bogota',
    horario_laboral VARCHAR(100),
    disponibilidad_actual VARCHAR(50) DEFAULT 'DISPONIBLE',
    puede_recibir_tareas BOOLEAN DEFAULT TRUE,
    max_tareas_activas INTEGER DEFAULT 5,
    prioridad_asignacion INTEGER DEFAULT 3,
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    habilidades TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_tipo_miembro CHECK (tipo_miembro IN ('HUMANO', 'AGENTE_IA', 'PROVEEDOR', 'CLIENTE_CONTACTO')),
    CONSTRAINT valid_estado_miembro CHECK (estado IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'ELIMINADO')),
    CONSTRAINT valid_disponibilidad_miembro CHECK (disponibilidad_actual IN ('DISPONIBLE', 'OCUPADO', 'AUSENTE', 'VACACIONES', 'NO_CONTACTAR'))
);

-- ================================================
-- Task Outputs (v1.0)
-- ================================================

CREATE TABLE IF NOT EXISTS task_outputs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_by_member_id INTEGER REFERENCES miembros(id) ON DELETE SET NULL,
    output_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    title VARCHAR(255),
    content TEXT,
    file_url TEXT,
    file_path TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_output_type CHECK (
        output_type IN ('TEXT', 'MARKDOWN', 'JSON', 'FILE_URL', 'FILE_PATH', 'IMAGE_URL', 'DOCUMENT_URL', 'SUMMARY', 'BRIEF', 'REPORT')
    )
);

CREATE INDEX IF NOT EXISTS idx_task_outputs_task_id ON task_outputs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_outputs_created_by_member_id ON task_outputs(created_by_member_id);
CREATE INDEX IF NOT EXISTS idx_task_outputs_output_type ON task_outputs(output_type);
CREATE INDEX IF NOT EXISTS idx_task_outputs_metadata ON task_outputs USING GIN (metadata);

-- ================================================
-- DATOS BASE - Miembros del Equipo (v2.0)
-- ================================================

INSERT INTO miembros (tipo_miembro, codigo, nombre, nombre_visible, rol, area, disponibilidad_actual, prioridad_asignacion) VALUES 
('HUMANO', 'HECTOR_1', 'Hector', 'Héctor Muñoz', 'CEO & General Orchestrator', 'DIRECCION', 'DISPONIBLE', 1),
('AGENTE_IA', 'YOA_2', 'YOA', 'YOA 🗂️', 'Chief Project Officer', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('AGENTE_IA', 'AURA_3', 'AURA', 'AURA 💡', 'Chief Strategy Officer', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('AGENTE_IA', 'FORGE_4', 'FORGE', 'FORGE 🔧', 'Chief Technology Officer', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('AGENTE_IA', 'FLUX_5', 'FLUX', 'FLUX ⚡', 'Chief Operating Officer', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('AGENTE_IA', 'PRISMA_6', 'PRISMA', 'PRISMA 🎨', 'Chief Creative Officer', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('AGENTE_IA', 'LINK_7', 'LINK', 'LINK 📢', 'Chief Communications Officer', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('AGENTE_IA', 'TEKTON_8', 'TEKTON', 'TEKTON 🛠️', 'Database Specialist', 'INTELIGENCIA_ARTIFICIAL', 'DISPONIBLE', 2),
('PROVEEDOR', 'ROSANA_VILAR_9', 'Rosana Vilar', 'Rosana Vilar', 'Diseño Web', 'OPERACIONES', 'DISPONIBLE', 3),
('PROVEEDOR', 'JOSE_VALDERRAMA_10', 'Jose Valderrama', 'Jose Valderrama', 'Cliente Propietario', 'OPERACIONES', 'DISPONIBLE', 3),
('PROVEEDOR', 'LUIS_ROSALES_11', 'Luis Rosales', 'Luis Rosales', 'Operaciones', 'OPERACIONES', 'DISPONIBLE', 3),
('PROVEEDOR', 'MICHELLE_12', 'Michelle', 'Michelle', 'Operaciones', 'OPERACIONES', 'DISPONIBLE', 3)
ON CONFLICT (codigo) DO NOTHING;

-- ================================================
-- DATOS BASE - Clientes (v2.1)
-- ================================================

INSERT INTO clientes (codigo, nombre_cliente, razon_social, tipo_cliente, email_principal, telefono_principal, whatsapp_principal, sitio_web, pais, ciudad, estado_cliente, prioridad, notas) VALUES 
('CLI-0006', 'Jose Valderrama', 'iSwift', 'EMPRESA', NULL, NULL, NULL, 'https://iswift.com', 'Colombia', 'Bogotá', 'ACTIVO', 2, 'Cliente iSwift - propietario')
ON CONFLICT (codigo) DO NOTHING;

-- ================================================
-- DATOS BASE - Proyectos (v2.2)
-- ================================================

INSERT INTO proyectos (codigo, nombre_proyecto, cliente_id, responsable_member_id, tipo_proyecto, estado_proyecto, prioridad_proyecto, descripcion, objetivo, alcance, fecha_inicio, notas) VALUES 
('PROJ-0001', 'iSwift', 1, 1, 'WEB', 'ACTIVO', 'ALTA', 'Desarrollo web y configuración de plataforma iSwift', 'Lanzar plataforma web de iSwift en producción', 'Frontend, backend, integraciones (SMTP, Calendly, GA, WP admin)', CURRENT_DATE, 'Proyecto principal de cliente iSwift')
ON CONFLICT (codigo) DO NOTHING;

-- ================================================
-- DATOS BASE - Tasks (v3.0)
-- ================================================

INSERT INTO tasks (codigo, title, description, status, priority, task_type, client_id, project_id, assigned_member_id, created_by_member_id, started_at, completed_at, worker_id) VALUES 
('TASK-0001', 'SMTP - Notificaciones', 'Sistema de notificaciones por email operativo. No requiere modificaciones.', 'COMPLETADA', 4, 'SEGUIMIENTO', 1, 1, NULL, 1, '2026-05-07 12:47:11', '2026-05-07 12:47:11', NULL),
('TASK-0002', 'Imagen destacada Home', 'Verificar si se puede usar canvas para imagen destacada. @Rosana Vilar debe verificar punto a) y consultar a Hector.', 'PENDIENTE', 3, 'CONTENIDO', 1, 1, 18, 1, NULL, NULL, 'Rosana Vilar'),
('TASK-0003', 'Segundo factor WordPress', 'Configurar segundo factor de autenticación en WordPress.', 'PENDIENTE', 3, 'IMPLEMENTACION', 1, 1, 18, 1, NULL, NULL, 'Rosana Vilar'),
('TASK-0004', 'Actualizar Jet Engine', 'Plugin de JetEngine necesita actualización.', 'COMPLETADA', 3, 'IMPLEMENTACION', 1, 1, 10, 1, '2026-05-07 12:47:11', '2026-05-07 12:47:11', 'Hector'),
('TASK-0005', 'Política de privacidad', 'Sacar la política anterior implementada por Rosana e implementar nueva.', 'COMPLETADA', 3, 'IMPLEMENTACION', 1, 1, 10, 1, '2026-05-07 12:47:11', '2026-05-07 12:47:11', 'Hector'),
('TASK-0006', 'Editar SEO páginas', 'Editar información SEO de cada página. Actualmente muestra "home_new" de "rosana".', 'PENDIENTE', 3, 'SEGUIMIENTO', 1, 1, NULL, 1, NULL, NULL, 'Jose Valderrama, Luis Rosales, Michelle'),
('TASK-0007', 'Configurar Calendly iSwift', 'Configurar calendario Calendly para iSwift.', 'PENDIENTE', 3, 'SEGUIMIENTO', 1, 1, NULL, 1, NULL, NULL, 'Jose Valderrama, Luis Rosales, Michelle'),
('TASK-0008', 'Crear usuario admin WordPress', 'Crear usuario administrador de iSwift en WordPress.', 'PENDIENTE', 3, 'SEGUIMIENTO', 1, 1, NULL, 1, NULL, NULL, 'Jose Valderrama, Luis Rosales, Michelle'),
('TASK-0009', 'Usuario Google Analytics', 'Crear usuario en Google Analytics y pasar acceso a Hector.', 'PENDIENTE', 3, 'SEGUIMIENTO', 1, 1, NULL, 1, NULL, NULL, 'Jose Valderrama, Luis Rosales, Michelle')
ON CONFLICT (codigo) DO NOTHING;

-- ================================================
-- DATOS BASE - Task Events (v1.0)
-- ================================================

INSERT INTO task_events (task_id, event_type, old_status, new_status, message, created_by_member_id, created_at)
SELECT id, 'COMPLETADA', 'PENDIENTE', 'COMPLETADA', 'Tarea marcada como completada', 
    (SELECT id FROM miembros WHERE codigo = 'HECTOR_1'), completed_at
FROM tasks WHERE status = 'COMPLETADA' AND completed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- ================================================
-- DATOS BASE - Task Logs (v1.0)
-- ================================================

INSERT INTO task_logs (task_id, member_id, log_level, message, created_at)
SELECT 
    id,
    (SELECT id FROM miembros WHERE codigo = 'HECTOR_1'),
    'INFO',
    'Tarea creada e inicializada',
    created_at
FROM tasks
ON CONFLICT DO NOTHING;