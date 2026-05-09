import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Clock, User, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import {
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Config ────────────────────────────────────────────────────────────────────

const KAMBA_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDIENTE', label: 'Pendiente' },
  { status: 'EN_PROGRESO', label: 'En Progreso' },
  { status: 'EN_REVISION', label: 'En Revisión' },
  { status: 'COMPLETADA', label: 'Completada' },
  { status: 'ESPERANDO_HUMANO', label: 'Esperando' },
  { status: 'BLOQUEADA', label: 'Bloqueada' },
  { status: 'ERROR', label: 'Error' },
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
  return new Date(dateStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'COMPLETADA') return false
  return new Date(dateStr) < new Date()
}

function isDueSoon(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'COMPLETADA') return false
  return (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 2
}

// ─── Card ────────────────────────────────────────────────────────────────────────

interface MobileTaskCardProps {
  task: Task
  index: number
  memberMap: Record<number, { nombre_visible: string }>
}

function MobileTaskCard({ task, index, memberMap }: MobileTaskCardProps) {
  const navigate = useNavigate()
  const overdue = isOverdue(task.due_date, task.status)
  const dueSoon = isDueSoon(task.due_date, task.status)
  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#6b7280'
  const member = task.assigned_member_id ? memberMap[task.assigned_member_id] : null

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => navigate(`/tareas/${task.id}`)}
          className={cn(
            'bg-[#fcfbf8] border border-[#eceae4] rounded-2xl p-3 cursor-pointer',
            'hover:border-[rgba(28,28,28,0.4)] transition-all duration-150',
            'select-none',
            snapshot.isDragging && 'shadow-lg border-[rgba(28,28,28,0.5)] rotate-1'
          )}
        >
          {/* Priority bar + Title */}
          <div className="flex items-start gap-2 mb-2">
            <div
              className="w-1 rounded-full shrink-0 mt-1"
              style={{ height: '36px', backgroundColor: priorityColor }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-[#5f5f5d] font-medium block mb-1">
                {task.codigo}
              </span>
              <p className="text-sm font-medium text-[#1c1c1c] leading-snug line-clamp-2">
                {task.title}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap ml-3">
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

          {/* Drag handle */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100">
            <GripVertical className="w-3.5 h-3.5 text-[#5f5f5d]" />
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ─── Column ─────────────────────────────────────────────────────────────────────

interface MobileKanbanColumnProps {
  status: TaskStatus
  label: string
  tasks: Task[]
  memberMap: Record<number, { nombre_visible: string }>
}

function MobileKanbanColumn({
  status,
  label,
  tasks,
  memberMap,
}: MobileKanbanColumnProps) {
  const statusInfo = TASK_STATUSES[status]

  return (
    <div className="flex flex-col min-w-[85vw] w-[85vw] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: statusInfo?.color ?? '#6b7280' }}
        />
        <span className="text-sm font-semibold text-[#1c1c1c]">{label}</span>
        <span className="ml-auto text-xs text-[#5f5f5d] bg-[#eceae4] px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-2xl p-2 min-h-[120px] border border-dashed',
              'bg-[#faf9f6]',
              'transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'border-[#3b82f6] bg-blue-50/30'
                : 'border-[#eceae4]'
            )}
          >
            <div className="space-y-2">
              {tasks.length === 0 && !snapshot.isDraggingOver ? (
                <div className="flex items-center justify-center h-16 text-xs text-[#5f5f5d]">
                  Sin tareas
                </div>
              ) : (
                tasks.map((task, index) => (
                  <MobileTaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    memberMap={memberMap}
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

// ─── Main View ────────────────────────────────────────────────────────────────

export function MobileKambaView() {
  const queryClient = useQueryClient()

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', {}],
    queryFn: () => api.tasks.list({}),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
  })

  const tasks: Task[] = tasksData?.items ?? []
  const members = membersData?.members ?? []

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

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

  // Sync columnTasks when tasks change
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
    tasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t)
    })
    setColumnTasks(map)
  }, [tasks])

  // API mutation for status changes
  const updateMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: number; newStatus: TaskStatus }) =>
      api.tasks.update(String(taskId), { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const taskId = Number(draggableId)
    const newStatus = destination.droppableId as TaskStatus
    const oldStatus = source.droppableId as TaskStatus

    setColumnTasks(prev => {
      const newMap: Record<TaskStatus, Task[]> = { ...prev }
      const sourceTasks = [...newMap[oldStatus]]
      const [movedTask] = sourceTasks.splice(source.index, 1)
      newMap[oldStatus] = sourceTasks
      const destTasks = [...newMap[newStatus]]
      destTasks.splice(destination.index, 0, { ...movedTask, status: newStatus })
      newMap[newStatus] = destTasks
      return newMap
    })

    updateMutation.mutate({ taskId, newStatus })
  }, [updateMutation])

  const totalTasks = tasks.length

  return (
    <div className="flex flex-col h-full">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1c1c1c]">Kanban</h1>
        <p className="text-xs text-[#5f5f5d]">
          {totalTasks} tarea{totalTasks !== 1 ? 's' : ''} · Desliza para mover
        </p>
      </div>

      {/* Horizontal scroll board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="flex gap-4 overflow-x-auto pb-4 flex-1 snap-x snap-mandatory"
          style={{
            scrollPaddingLeft: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {KAMBA_COLUMNS.map(col => (
            <div key={col.status} className="snap-center">
              <MobileKanbanColumn
                status={col.status}
                label={col.label}
                tasks={columnTasks[col.status] ?? []}
                memberMap={memberMap}
              />
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
