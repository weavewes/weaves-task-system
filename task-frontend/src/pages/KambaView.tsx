import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, LayoutGrid, GripVertical, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from '@/lib/types'

interface KambaViewProps {
  /** When provided, uses these filters and fetches real data from the API.
   *  Without it, renders in standalone mock mode. */
  inlineFilters?: { status?: string; project_id?: string; member_id?: string }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROJECTS = [
  { id: 1, codigo: 'PROJ-001', nombre_proyecto: 'TAC Advisors – Rediseño Web' },
  { id: 2, codigo: 'PROJ-002', nombre_proyecto: 'Stellamia – Branding' },
  { id: 3, codigo: 'PROJ-003', nombre_proyecto: 'Spazio – Manual Bodywork' },
]

const MOCK_MEMBERS = [
  { id: 1, nombre_visible: 'FORGE' },
  { id: 2, nombre_visible: 'FLUX' },
  { id: 3, nombre_visible: 'PRISMA' },
  { id: 4, nombre_visible: 'YOA' },
  { id: 5, nombre_visible: 'Héctor' },
]

const MOCK_TASKS: Task[] = [
  {
    id: 1,
    codigo: 'TASK-0001',
    title: 'Diseñar wireframes homepage',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'PENDIENTE',
    priority: 3,
    task_type: 'DISENO',
    due_date: '2026-05-15',
    client_id: 1,
    project_id: 1,
    assigned_member_id: 3,
    responsible_member_id: null,
    reviewer_member_id: null,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
  },
  {
    id: 2,
    codigo: 'TASK-0002',
    title: 'Implementar API de clientes',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'EN_PROGRESO',
    priority: 5,
    task_type: 'DESARROLLO',
    due_date: '2026-05-10',
    client_id: 2,
    project_id: 2,
    assigned_member_id: 1,
    responsible_member_id: null,
    reviewer_member_id: null,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-02T10:00:00Z',
    updated_at: '2026-05-02T10:00:00Z',
  },
  {
    id: 3,
    codigo: 'TASK-0003',
    title: 'Revisar branding guidelines',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'EN_REVISION',
    priority: 4,
    task_type: 'REVISION',
    due_date: '2026-05-12',
    client_id: 2,
    project_id: 2,
    assigned_member_id: 4,
    responsible_member_id: null,
    reviewer_member_id: 5,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-03T10:00:00Z',
    updated_at: '2026-05-03T10:00:00Z',
  },
  {
    id: 4,
    codigo: 'TASK-0004',
    title: 'Escribir copy página contacto',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'COMPLETADA',
    priority: 3,
    task_type: 'COMUNICACION',
    due_date: '2026-05-08',
    client_id: 1,
    project_id: 1,
    assigned_member_id: 2,
    responsible_member_id: null,
    reviewer_member_id: null,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: '2026-05-07T14:00:00Z',
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-04T10:00:00Z',
    updated_at: '2026-05-07T14:00:00Z',
  },
  {
    id: 5,
    codigo: 'TASK-0005',
    title: 'Configurar pipeline CI/CD',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'EN_PROGRESO',
    priority: 4,
    task_type: 'DESARROLLO',
    due_date: '2026-05-14',
    client_id: 3,
    project_id: 3,
    assigned_member_id: 1,
    responsible_member_id: null,
    reviewer_member_id: null,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-05T10:00:00Z',
    updated_at: '2026-05-05T10:00:00Z',
  },
  {
    id: 6,
    codigo: 'TASK-0006',
    title: '撰写月度报告',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'PENDIENTE',
    priority: 2,
    task_type: 'ADMINISTRATIVO',
    due_date: '2026-05-20',
    client_id: null,
    project_id: null,
    assigned_member_id: 4,
    responsible_member_id: null,
    reviewer_member_id: null,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-06T10:00:00Z',
    updated_at: '2026-05-06T10:00:00Z',
  },
  {
    id: 7,
    codigo: 'TASK-0007',
    title: 'Preparar presentación cliente',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'EN_REVISION',
    priority: 5,
    task_type: 'COMUNICACION',
    due_date: '2026-05-09',
    client_id: 1,
    project_id: 1,
    assigned_member_id: 2,
    responsible_member_id: null,
    reviewer_member_id: 5,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: null,
    visible_para_pm: true,
    requiere_aprobacion: true,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-07T10:00:00Z',
    updated_at: '2026-05-07T10:00:00Z',
  },
  {
    id: 8,
    codigo: 'TASK-0008',
    title: 'Optimizar queries de base de datos',
    description: '',
    expected_output: null,
    acceptance_criteria: null,
    status: 'COMPLETADA',
    priority: 4,
    task_type: 'DESARROLLO',
    due_date: '2026-05-06',
    client_id: 2,
    project_id: 2,
    assigned_member_id: 1,
    responsible_member_id: null,
    reviewer_member_id: null,
    created_by_member_id: 5,
    worker_id: null,
    claimed_at: null,
    lease_expires_at: null,
    started_at: null,
    completed_at: '2026-05-06T18:00:00Z',
    visible_para_pm: true,
    requiere_aprobacion: false,
    bloqueada_por: null,
    motivo_bloqueo: null,
    fecha_ultimo_seguimiento: null,
    proxima_accion: null,
    source: null,
    external_id: null,
    context_data: null,
    input_payload: null,
    result_payload: null,
    agent_notes: null,
    human_notes: null,
    error_message: null,
    retry_count: 0,
    max_retries: 5,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-06T18:00:00Z',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; text: string }> = {
  1: { label: 'Baja', color: '#6b7280', bg: 'bg-gray-100', text: 'text-gray-600' },
  2: { label: 'Media baja', color: '#6b7280', bg: 'bg-gray-100', text: 'text-gray-600' },
  3: { label: 'Media', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-600' },
  4: { label: 'Alta', color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-600' },
  5: { label: 'Crítica', color: '#ef4444', bg: 'bg-red-50', text: 'text-red-600' },
}

function getMemberName(id: number | null, members: typeof MOCK_MEMBERS = MOCK_MEMBERS): string {
  if (!id) return '—'
  return members.find((m: any) => m.id === id)?.nombre_visible ?? '—'
}

function getProjectLabel(projectId: number | null, projects: typeof MOCK_PROJECTS = MOCK_PROJECTS): string {
  if (!projectId) return 'Sin proyecto'
  return projects.find((p: any) => p.id === projectId)?.nombre_proyecto ?? '—'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
}

function isDueSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= 2 && diff >= 0
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ─── Kanban Columns ────────────────────────────────────────────────────────────

const KAMBA_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDIENTE', label: 'Pendiente' },
  { status: 'EN_PROGRESO', label: 'En Progreso' },
  { status: 'ESPERANDO_HUMANO', label: 'Esperando Humano' },
  { status: 'ESPERANDO_CLIENTE', label: 'Esperando Cliente' },
  { status: 'BLOQUEADA', label: 'Bloqueada' },
  { status: 'EN_REVISION', label: 'En Revisión' },
  { status: 'COMPLETADA', label: 'Completada' },
  { status: 'ERROR', label: 'Error' },
  { status: 'CANCELADA', label: 'Cancelada' },
]

const EMPTY_COLUMN: Task[] = []

// ─── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  index: number
  members: typeof MOCK_MEMBERS
  projects: typeof MOCK_PROJECTS
}

function TaskCard({ task, index, members, projects }: TaskCardProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[3]
  const overdue = task.status !== 'COMPLETADA' && isOverdue(task.due_date)
  const dueSoon = !overdue && isDueSoon(task.due_date)

  const handleClick = () => {
    const search = searchParams.toString()
    navigate(`/tareas/${task.id}${search ? `?${search}` : ''}`)
  }

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'group relative bg-[#f7f4ed] border border-[#eceae4] rounded-xl p-4 cursor-pointer',
            'hover:border-[rgba(28,28,28,0.4)] transition-all duration-150',
            'select-none',
            snapshot.isDragging && 'shadow-lg border-[rgba(28,28,28,0.5)] rotate-1'
          )}
          onClick={handleClick}
        >
          {/* Código + Priority Badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-mono text-[#5f5f5d] font-medium">
              {task.codigo}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                priority.bg,
                priority.text
              )}
              style={{ border: 'none' }}
            >
              {priority.label}
            </Badge>
          </div>

          {/* Título */}
          <p className="text-sm text-[#1c1c1c] font-medium leading-snug mb-3">
            {task.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[11px] text-[#5f5f5d]">
            {/* Due date */}
            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1',
                overdue && 'text-red-500 font-medium',
                dueSoon && 'text-amber-600 font-medium'
              )}>
                <Clock className="w-3 h-3" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}

            {/* Assigned */}
            {task.assigned_member_id && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{getMemberName(task.assigned_member_id, members)}</span>
              </div>
            )}
          </div>

          {/* Proyecto tag */}
          {task.project_id && (
            <div className="mt-2 pt-2 border-t border-[#eceae4]">
              <span className="text-[10px] text-[#5f5f5d] font-medium uppercase tracking-wide">
                {getProjectLabel(task.project_id, projects)}
              </span>
            </div>
          )}

          {/* Drag handle indicator */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5 text-[#5f5f5d] mt-1 mr-1" />
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ─── Column ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  tasks: Task[]
  members: typeof MOCK_MEMBERS
  projects: typeof MOCK_PROJECTS
}

function KanbanColumn({ status, label, tasks, members, projects }: KanbanColumnProps) {
  const statusInfo = TASK_STATUSES[status]

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: statusInfo.color }}
        />
        <span className="text-sm font-semibold text-[#1c1c1c] tracking-tight">
          {label}
        </span>
        <span className="ml-auto text-xs text-[#5f5f5d] bg-[#eceae4] px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Drop Zone + Task List */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-xl p-2 min-h-[200px]',
              'border border-dashed',
              'bg-[#faf9f6]',
              'transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'border-[#3b82f6] bg-blue-50/30'
                : 'border-[#eceae4]'
            )}
          >
            <div className="space-y-2">
              {tasks.length === 0 && !snapshot.isDraggingOver ? (
                <div className="flex items-center justify-center h-20 text-xs text-[#5f5f5d]">
                  Sin tareas
                </div>
              ) : (
                tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    members={members}
                    projects={projects}
                  />
                ))
              )}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  )
}

// ─── Filter Bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  selectedProject: string
  selectedStatus: string
  selectedPriority: string
  onProjectChange: (v: string) => void
  onStatusChange: (v: string) => void
  onPriorityChange: (v: string) => void
  onClear: () => void
}

function FilterBar({
  selectedProject,
  selectedStatus,
  selectedPriority,
  onProjectChange,
  onStatusChange,
  onPriorityChange,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters =
    selectedProject !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Project filter */}
      <Select value={selectedProject} onValueChange={onProjectChange}>
        <SelectTrigger className="w-[220px] h-8 text-xs border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]">
          <SelectValue placeholder="Todos los proyectos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los proyectos</SelectItem>
          {MOCK_PROJECTS.map(p => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.nombre_proyecto}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]">
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {KAMBA_COLUMNS.map(col => (
            <SelectItem key={col.status} value={col.status}>
              {col.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select value={selectedPriority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]">
          <SelectValue placeholder="Todas las prioridades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las prioridades</SelectItem>
          {[1, 2, 3, 4, 5].map(p => (
            <SelectItem key={p} value={String(p)}>
              {PRIORITY_CONFIG[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs text-[#5f5f5d] hover:text-[#1c1c1c] border border-transparent hover:border-[#eceae4]"
        >
          <X className="w-3 h-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}

// ─── Main View ─────────────────────────────────────────────────────────────────

export function KambaView({ inlineFilters }: KambaViewProps = {}) {
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')

  const queryClient = useQueryClient()

  // Real API data when used inline (inside TaskList)
  const { data: realTasks } = useQuery({
    queryKey: ['tasks', inlineFilters],
    queryFn: () => api.tasks.list({
      status: inlineFilters?.status,
      project_id: inlineFilters?.project_id,
      member_id: inlineFilters?.member_id,
    }),
    enabled: !!inlineFilters,
  })

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
    enabled: !!inlineFilters,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!inlineFilters,
  })

  // Use real tasks when available, mock otherwise
  const tasks: Task[] = realTasks?.items ?? (inlineFilters ? [] : MOCK_TASKS)
  const members = membersData?.members ?? MOCK_MEMBERS
  const projects = projectsData?.items ?? MOCK_PROJECTS

  // Mutable column state for drag & drop reordering
  const [columnTasks, setColumnTasks] = useState<Record<TaskStatus, Task[]>>(() => {
    const map: Record<TaskStatus, Task[]> = {
      PENDIENTE: [],
      EN_PROGRESO: [],
      EN_REVISION: [],
      COMPLETADA: [],
      ESPERANDO_HUMANO: [],
      ESPERANDO_CLIENTE: [],
      BLOQUEADA: [],
      ERROR: [],
      CANCELADA: [],
    }
    return map
  })

  // Sync columnTasks when tasks change (new data loaded)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedProject !== 'all' && task.project_id !== Number(selectedProject)) return false
      if (selectedStatus !== 'all' && task.status !== selectedStatus) return false
      if (selectedPriority !== 'all' && task.priority !== Number(selectedPriority)) return false
      return true
    })
  }, [tasks, selectedProject, selectedStatus, selectedPriority])

  // Sync columnTasks when filtered tasks change (useEffect to handle side effect)
  useEffect(() => {
    const map: Record<TaskStatus, Task[]> = {
      PENDIENTE: [],
      EN_PROGRESO: [],
      EN_REVISION: [],
      COMPLETADA: [],
      ESPERANDO_HUMANO: [],
      ESPERANDO_CLIENTE: [],
      BLOQUEADA: [],
      ERROR: [],
      CANCELADA: [],
    }
    filteredTasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t)
    })
    setColumnTasks(map)
  }, [filteredTasks])

  // API mutation for inline mode
  const updateMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: number; newStatus: TaskStatus }) =>
      api.tasks.update(String(taskId), { status: newStatus }),
    onSuccess: () => {
      if (inlineFilters) {
        queryClient.invalidateQueries({ queryKey: ['tasks', inlineFilters] })
      }
    },
  })

  // Drag & drop handler
  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const taskId = Number(draggableId)
    const newStatus = destination.droppableId as TaskStatus
    const oldStatus = source.droppableId as TaskStatus

    setColumnTasks(prev => {
      const newMap: Record<TaskStatus, Task[]> = { ...prev }
      // Remove from source
      const sourceTasks = [...newMap[oldStatus]]
      const [movedTask] = sourceTasks.splice(source.index, 1)
      newMap[oldStatus] = sourceTasks
      // Insert into destination
      const destTasks = [...newMap[newStatus]]
      destTasks.splice(destination.index, 0, { ...movedTask, status: newStatus })
      newMap[newStatus] = destTasks
      return newMap
    })

    // Persist to API in inline mode
    if (inlineFilters) {
      updateMutation.mutate({ taskId, newStatus })
    }
  }, [inlineFilters, updateMutation])

  const handleClear = () => {
    setSelectedProject('all')
    setSelectedStatus('all')
    setSelectedPriority('all')
  }

  const totalTasks = filteredTasks.length

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">
            Vista Kamba
          </h1>
          <p className="text-sm text-[#5f5f5d] mt-0.5">
            {totalTasks} tarea{totalTasks !== 1 ? 's' : ''} · Vista kanban
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5f5f5d]">
          <LayoutGrid className="w-4 h-4" />
          <span>Kanban</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          selectedProject={selectedProject}
          selectedStatus={selectedStatus}
          selectedPriority={selectedPriority}
          onProjectChange={setSelectedProject}
          onStatusChange={setSelectedStatus}
          onPriorityChange={setSelectedPriority}
          onClear={handleClear}
        />
      </div>

      {/* Kanban Board with DragDropContext */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {KAMBA_COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={columnTasks[col.status] ?? EMPTY_COLUMN}
              members={members}
              projects={projects}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
