import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TASK_STATUSES = {
  PENDIENTE: { label: 'Pendiente', color: '#5f5f5d' },
  EN_PROGRESO: { label: 'En Progreso', color: '#3b82f6' },
  ESPERANDO_HUMANO: { label: 'Esperando Humano', color: '#f59e0b' },
  ESPERANDO_CLIENTE: { label: 'Esperando Cliente', color: '#8b5cf6' },
  BLOQUEADA: { label: 'Bloqueada', color: '#ef4444' },
  EN_REVISION: { label: 'En Revisión', color: '#06b6d4' },
  COMPLETADA: { label: 'Completada', color: '#22c55e' },
  ERROR: { label: 'Error', color: '#dc2626' },
  CANCELADA: { label: 'Cancelada', color: '#6b7280' },
} as const

export type TaskStatus = keyof typeof TASK_STATUSES

export const PRIORITIES: Record<number, { label: string; color: string }> = {
  1: { label: 'Baja', color: '#6b7280' },
  2: { label: 'Media baja', color: '#6b7280' },
  3: { label: 'Media', color: '#3b82f6' },
  4: { label: 'Alta', color: '#f97316' },
  5: { label: 'Crítica', color: '#ef4444' },
}

export const TASK_TYPES = [
  'DESARROLLO',
  'DISENO',
  'INVESTIGACION',
  'COMUNICACION',
  'REVISION',
  'ADMINISTRATIVO',
  'OTRO',
] as const

export type TaskType = typeof TASK_TYPES[number]

export interface LogEntry {
  id: string | number
  task_id: number
  member_id: number | null
  log_level: string
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Event {
  id: string | number
  task_id: number
  event_type: string
  old_status: string | null
  new_status: string | null
  message: string
  created_by_member_id: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface LogsResponse {
  task_id: number
  logs: LogEntry[]
}

export interface EventsResponse {
  task_id: number
  events: Event[]
}

export interface Task {
  id: number
  codigo: string
  title: string
  description: string
  expected_output: string | null
  acceptance_criteria: string | null
  status: TaskStatus
  priority: number
  task_type: string
  due_date: string | null
  client_id: number | null
  project_id: number | null
  assigned_member_id: number | null
  responsible_member_id: number | null
  reviewer_member_id: number | null
  created_by_member_id: number | null
  worker_id: string | null
  claimed_at: string | null
  lease_expires_at: string | null
  started_at: string | null
  completed_at: string | null
  visible_para_pm: boolean
  requiere_aprobacion: boolean
  bloqueada_por: number | null
  motivo_bloqueo: string | null
  fecha_ultimo_seguimiento: string | null
  proxima_accion: string | null
  source: string | null
  external_id: string | null
  context_data: Record<string, unknown> | null
  input_payload: Record<string, unknown> | null
  result_payload: Record<string, unknown> | null
  agent_notes: string | null
  human_notes: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  created_at: string
  updated_at: string
  project?: {
    codigo: string
    nombre_proyecto: string
    cliente_id: number
    responsable_member_id: number | null
    tipo_proyecto: string
    estado_proyecto: string
    prioridad_proyecto: string
    descripcion: string | null
  }
}

export interface Project {
  id: number
  codigo: string
  nombre_proyecto: string
  cliente_id: number | null
  responsable_member_id: number | null
  tipo_proyecto: string
  estado_proyecto: string
  prioridad_proyecto: string
  descripcion: string | null
  objetivo: string | null
  alcance: string | null
  fecha_inicio: string | null
  fecha_entrega_estimada: string | null
  fecha_cierre: string | null
  presupuesto_estimado: string | null
  origen: string | null
  external_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  etiqueta: string
  nombre_del_cliente: string
  email: string | null
  empresa: string | null
  numero_de_telefono: string | null
  notas: string | null
  created_at?: string
  updated_at?: string
}

export interface Member {
  id: number
  tipo_miembro: string
  codigo: string
  nombre: string
  nombre_visible: string
  rol: string | null
  area: string | null
  email: string | null
  telefono: string | null
  whatsapp: string | null
  telegram_username: string | null
  mattermost_username: string | null
  modelo: string | null
  proveedor_modelo: string | null
  endpoint_api: string | null
  prompt_base: string | null
  zona_horaria: string
  horario_laboral: string | null
  disponibilidad_actual: string
  puede_recibir_tareas: boolean
  max_tareas_activas: number
  prioridad_asignacion: number
  estado: string
  habilidades: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface TaskOutput {
  id: number
  task_id: number
  created_by_member_id: number | null
  output_type: string
  title: string | null
  content: string | null
  file_url: string | null
  file_path: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface DependencyOutputItem {
  source_task_id: number
  source_task_title: string
  created_by: string
  output_type: string
  title: string | null
  content: string | null
  file_url: string | null
  file_path: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}