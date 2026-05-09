import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, User, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { TASK_STATUSES, type Task, type TaskStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'Todas', value: undefined },
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'En Progreso', value: 'EN_PROGRESO' },
  { label: 'En Revisión', value: 'EN_REVISION' },
  { label: 'Completada', value: 'COMPLETADA' },
]

const PRIORITY_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#6b7280',
  3: '#3b82f6',
  4: '#f97316',
  5: '#ef4444',
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'PENDIENTE': return 'pendiente'
    case 'EN_PROGRESO': return 'progreso'
    case 'ESPERANDO_HUMANO': return 'esperando_humano'
    case 'ESPERANDO_CLIENTE': return 'esperando_cliente'
    case 'BLOQUEADA': return 'bloqueada'
    case 'EN_REVISION': return 'revision'
    case 'COMPLETADA': return 'completada'
    case 'ERROR': return 'error'
    case 'CANCELADA': return 'cancelada'
    default: return 'secondary'
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'COMPLETADA') return false
  return new Date(dateStr) < new Date()
}

function isDueSoon(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'COMPLETADA') return false
  const diff = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  return diff <= 2 && diff >= 0
}

interface MobileTaskCardProps {
  task: Task
  memberMap: Record<number, { nombre_visible: string }>
  projectMap: Record<number, { nombre_proyecto: string }>
}

function MobileTaskCard({ task, memberMap, projectMap }: MobileTaskCardProps) {
  const navigate = useNavigate()
  const overdue = isOverdue(task.due_date, task.status)
  const dueSoon = isDueSoon(task.due_date, task.status)
  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#6b7280'
  const member = task.assigned_member_id ? memberMap[task.assigned_member_id] : null
  const project = task.project_id ? projectMap[task.project_id] : null

  return (
    <button
      onClick={() => navigate(`/tareas/${task.id}`)}
      className="w-full text-left bg-[#fcfbf8] border border-[#eceae4] rounded-2xl p-4 active:scale-[0.99] transition-transform"
      style={{ minHeight: '72px' }}
    >
      <div className="flex items-start gap-3">
        {/* Priority color bar */}
        <div
          className="w-1.5 rounded-full shrink-0 mt-1"
          style={{ height: '48px', backgroundColor: priorityColor }}
        />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-[#1c1c1c] leading-snug line-clamp-2 flex-1">
              {task.title}
            </span>
            <ChevronRight className="w-4 h-4 text-[#5f5f5d] shrink-0 mt-0.5" />
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant={statusVariant(task.status) as any}
              className="text-[10px] px-2 py-0.5"
            >
              {TASK_STATUSES[task.status as TaskStatus]?.label ?? task.status}
            </Badge>

            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1 text-[11px]',
                overdue ? 'text-red-500 font-semibold' : dueSoon ? 'text-amber-600 font-medium' : 'text-[#5f5f5d]'
              )}>
                <Clock className="w-3 h-3" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}

            {member && (
              <div className="flex items-center gap-1 text-[11px] text-[#5f5f5d]">
                <User className="w-3 h-3" />
                <span>{member.nombre_visible}</span>
              </div>
            )}
          </div>

          {/* Project tag */}
          {project && (
            <div className="mt-2">
              <span className="text-[10px] text-[#5f5f5d] uppercase tracking-wide font-medium">
                {project.nombre_proyecto}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

export function MobileTasks() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  function useQueryState(key: string): [string | undefined, (v: string) => void] {
    const value = searchParams.get(key) ?? undefined
    const setValue = (v: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (v === undefined || v === '') {
          next.delete(key)
        } else {
          next.set(key, v)
        }
        return next
      })
    }
    return [value, setValue]
  }

  const [statusFilter, setStatusFilter] = useQueryState('status')

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', { status: statusFilter }],
    queryFn: () => api.tasks.list({ status: statusFilter }),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const tasks = tasksData?.items ?? []
  const memberMap = Object.fromEntries(
    (membersData?.members ?? []).map(m => [m.id, m])
  )
  const projectMap = Object.fromEntries(
    (projectsData?.items ?? []).map(p => [p.id, p])
  )

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold text-[#1c1c1c]">Tareas</h1>
        <p className="text-xs text-[#5f5f5d]">{tasks.length} tareas</p>
      </div>

      {/* Chip filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(value ?? '')}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              statusFilter === value || (value === undefined && statusFilter === undefined)
                ? 'bg-[#1c1c1c] text-[#fcfbf8]'
                : 'bg-[#eceae4] text-[#5f5f5d] hover:bg-[#e0ddd5]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#5f5f5d] text-sm">
            Cargando...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#5f5f5d] text-sm gap-2">
            <span>No hay tareas</span>
            <button
              onClick={() => navigate('/tareas/nueva')}
              className="text-xs text-[#3b82f6] font-medium"
            >
              Crear primera tarea
            </button>
          </div>
        ) : (
          tasks.map(task => (
            <MobileTaskCard
              key={task.id}
              task={task}
              memberMap={memberMap}
              projectMap={projectMap}
            />
          ))
        )}
      </div>
    </div>
  )
}
