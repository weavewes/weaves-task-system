import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { TaskStatus } from '@/lib/types'

interface StatsCardsProps {
  onStatusFilter?: (status: TaskStatus | null) => void
  activeFilter?: TaskStatus | null
}

export function StatsCards({ onStatusFilter, activeFilter }: StatsCardsProps) {
  const navigate = useNavigate()

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
  })

  const tasks = tasksData?.items ?? []

  const counts: Record<TaskStatus, number> = {
    PENDIENTE: 0,
    EN_PROGRESO: 0,
    ESPERANDO_HUMANO: 0,
    ESPERANDO_CLIENTE: 0,
    BLOQUEADA: 0,
    EN_REVISION: 0,
    COMPLETADA: 0,
    ERROR: 0,
    CANCELADA: 0,
  }

  const today = new Date().toISOString().split('T')[0]
  let completedToday = 0

  for (const task of tasks) {
    if (task.status in counts) {
      counts[task.status as TaskStatus]++
    }
    if (task.status === 'COMPLETADA' && task.updated_at?.startsWith(today)) {
      completedToday++
    }
  }

  const cards: Array<{ key: TaskStatus; label: string; color: string; count: number }> = [
    { key: 'PENDIENTE', label: 'Pendientes', color: '#5f5f5d', count: counts.PENDIENTE },
    { key: 'EN_PROGRESO', label: 'En Progreso', color: '#3b82f6', count: counts.EN_PROGRESO },
    { key: 'ESPERANDO_HUMANO', label: 'Esperando Humano', color: '#f59e0b', count: counts.ESPERANDO_HUMANO },
    { key: 'ESPERANDO_CLIENTE', label: 'Esperando Cliente', color: '#8b5cf6', count: counts.ESPERANDO_CLIENTE },
    { key: 'BLOQUEADA', label: 'Bloqueadas', color: '#ef4444', count: counts.BLOQUEADA },
    { key: 'EN_REVISION', label: 'En Revisión', color: '#06b6d4', count: counts.EN_REVISION },
    { key: 'COMPLETADA', label: 'Completadas', color: '#22c55e', count: counts.COMPLETADA },
    { key: 'ERROR', label: 'Errores', color: '#dc2626', count: counts.ERROR },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map(({ key, label, color, count }) => (
        <Card
          key={key}
          className={cn(
            'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]',
            activeFilter === key && 'ring-2 ring-[#1c1c1c]'
          )}
          onClick={() => {
            if (activeFilter === key) {
              onStatusFilter?.(null)
            } else {
              onStatusFilter?.(key)
              navigate(`/tareas?status=${key}`)
            }
          }}
        >
          <CardContent className="p-4">
            <div className="text-3xl font-semibold tracking-tight" style={{ color }}>{count}</div>
            <div className="text-sm text-[#5f5f5d] mt-0.5">{label}</div>
          </CardContent>
        </Card>
      ))}
      <Card
        className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
        onClick={() => navigate('/tareas?completada_hoy=true')}
      >
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tracking-tight text-[#22c55e]">{completedToday}</div>
          <div className="text-sm text-[#5f5f5d] mt-0.5">Completadas hoy</div>
        </CardContent>
      </Card>
    </div>
  )
}
