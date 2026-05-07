import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TASK_STATUSES, PRIORITIES } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function RecentTasks() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
  })

  const recentTasks = (data?.items ?? [])
    .filter(t => !['COMPLETADA', 'CANCELADA'].includes(t.status))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8)

  if (recentTasks.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tareas activas recientes</CardTitle>
        <button
          onClick={() => navigate('/tareas')}
          className="text-sm text-[#5f5f5d] hover:text-[#1c1c1c] flex items-center gap-1 transition-colors"
        >
          Ver todas <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentTasks.map(task => {
          const statusInfo = TASK_STATUSES[task.status]
          const priorityInfo = PRIORITIES[task.priority]
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#eceae4] bg-[#f7f4ed] cursor-pointer hover:bg-[rgba(28,28,28,0.03)] transition-colors"
              onClick={() => navigate(`/tareas/${task.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#5f5f5d]">{task.codigo}</span>
                  <span className="text-sm font-medium truncate">{task.title}</span>
                </div>
              </div>
              <Badge
                variant={
                  task.status === 'PENDIENTE' ? 'pendiente' :
                  task.status === 'EN_PROGRESO' ? 'progreso' :
                  task.status === 'ESPERANDO_HUMANO' ? 'esperando_humano' :
                  task.status === 'ESPERANDO_CLIENTE' ? 'esperando_cliente' :
                  task.status === 'BLOQUEADA' ? 'bloqueada' :
                  task.status === 'EN_REVISION' ? 'revision' :
                  task.status === 'COMPLETADA' ? 'completada' :
                  task.status === 'ERROR' ? 'error' :
                  'secondary'
                }
                className="text-xs shrink-0"
              >
                {statusInfo?.label ?? task.status}
              </Badge>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: priorityInfo?.color }}
                title={`Prioridad ${priorityInfo?.label}`}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
