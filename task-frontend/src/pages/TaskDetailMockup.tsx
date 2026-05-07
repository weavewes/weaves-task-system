import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TASK_STATUSES, PRIORITIES } from '@/lib/types'
import { CheckCircle, AlertCircle, Clock, User, Calendar } from 'lucide-react'

const mockTask = {
  id: '1',
  codigo: 'TASK-0001',
  title: 'SMTP - Notificaciones',
  description: 'Sistema de notificaciones por email operativo.',
  status: 'COMPLETADA' as const,
  priority: 4,
  task_type: 'SEGUIMIENTO',
  due_date: null,
  assigned_member_id: 10,
  responsible_member_id: null,
  reviewer_member_id: null,
  created_by_member_id: 10,
  created_at: '2026-05-07T12:47:11.100676',
  started_at: '2026-05-07T12:47:11.100676',
  completed_at: '2026-05-07T12:47:11.100676',
  fecha_ultimo_seguimiento: null,
}

const mockEvents = [
  { id: 1, task_id: '1', event_type: 'created', timestamp: '2026-05-07T12:47:11.100676', description: 'Tarea creada' },
  { id: 2, task_id: '1', event_type: 'started', timestamp: '2026-05-07T12:47:11.100676', description: 'Tarea iniciada' },
  { id: 3, task_id: '1', event_type: 'completed', timestamp: '2026-05-07T12:47:11.100676', description: 'Tarea completada' },
]

const mockLogs = [
  '[14:30] Agent: Tarea iniciada',
  '[14:35] Agent: Verificando configuración SMTP',
  '[14:40] Agent: Sistema operativo - no se requieren cambios',
]

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

export function TaskDetailMockup() {
  const task = mockTask
  const statusInfo = TASK_STATUSES[task.status]
  const priorityInfo = PRIORITIES[task.priority]

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm text-[#5f5f5d] bg-[#eceae4] px-2 py-0.5 rounded">
            {task.codigo}
          </span>
          <Badge variant={statusVariant(task.status)}>{statusInfo?.label ?? task.status}</Badge>
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: priorityInfo?.color + '20', color: priorityInfo?.color }}
          >
            {priorityInfo?.label}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column — Info + Metadata */}
        <div className="lg:col-span-2 space-y-4">

          {/* Info Principal */}
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div>
                <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Descripción</div>
                <p className="text-sm">{task.description || 'Sin descripción'}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Tipo de tarea</div>
                <p className="text-sm">{task.task_type}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Fecha límite</div>
                <p className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString('es-CO') : '—'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Asignación */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Asignación</div>
              {[
                { label: 'Asignado', value: task.assigned_member_id },
                { label: 'Responsable', value: task.responsible_member_id },
                { label: 'Revisor', value: task.reviewer_member_id },
                { label: 'Creado por', value: task.created_by_member_id },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-[#5f5f5d]" />
                  <span className="text-[#5f5f5d] w-28 shrink-0">{label}:</span>
                  <span>{value ?? '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tiempos */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Tiempos</div>
              {[
                { label: 'Creado', value: task.created_at },
                { label: 'Iniciado', value: task.started_at },
                { label: 'Completado', value: task.completed_at },
                { label: 'Último seguimiento', value: task.fecha_ultimo_seguimiento },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-[#5f5f5d]" />
                  <span className="text-[#5f5f5d] w-36 shrink-0">{label}:</span>
                  <span className="text-[#5f5f5d]">
                    {value ? new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Timeline + Logs + Actions */}
        <div className="space-y-4">

          {/* Events Timeline */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-3">
                Events Timeline
              </div>
              <div className="relative space-y-0">
                {mockEvents.map((event, index) => (
                  <div key={event.id} className="flex gap-3 relative">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#3b82f6] mt-1.5 shrink-0" />
                      {index < mockEvents.length - 1 && (
                        <div className="w-px flex-1 bg-[#eceae4] my-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="text-xs text-[#5f5f5d]">
                        {new Date(event.timestamp).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                      <div className="text-sm font-medium mt-0.5">{event.event_type}</div>
                      <div className="text-xs text-[#5f5f5d]">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent Logs */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-3">
                Logs del Agente
              </div>
              <pre className="text-xs bg-[#1c1c1c] text-[#f7f4ed] rounded-md p-3 overflow-auto">
                {mockLogs.join('\n')}
              </pre>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-3">
                Acciones
              </div>
              <div className="space-y-2">
                <Button disabled className="w-full justify-start" variant="surface" size="sm">
                  <CheckCircle className="h-4 w-4" /> Marcar Completada
                </Button>
                <Button disabled className="w-full justify-start" variant="ghost" size="sm">
                  <AlertCircle className="h-4 w-4" /> Bloquear
                </Button>
                <Button disabled className="w-full justify-start" variant="ghost" size="sm">
                  <User className="h-4 w-4" /> Enviar a Humano
                </Button>
                <Button disabled className="w-full justify-start" variant="ghost" size="sm">
                  <Clock className="h-4 w-4" /> Heartbeat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}