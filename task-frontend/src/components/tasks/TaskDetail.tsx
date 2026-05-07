import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TASK_STATUSES, PRIORITIES } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, User, AlertCircle, CheckCircle, Package } from 'lucide-react'

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

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Task data
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.tasks.get(id!),
    enabled: !!id,
  })

  // Members list (for resolving IDs → names)
  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
  })

  // Project (embedded in task response, but also fetch separately for name resolution)
  const { data: projectData } = useQuery({
    queryKey: ['project', task?.project_id],
    queryFn: () => api.projects.byId(String(task!.project_id)),
    enabled: !!task?.project_id,
  })

  // Events timeline
  const { data: eventsData } = useQuery({
    queryKey: ['task-events', id],
    queryFn: () => api.tasks.events(id!),
    enabled: !!id,
  })

  // Agent logs
  const { data: logsData } = useQuery({
    queryKey: ['task-logs', id],
    queryFn: () => api.tasks.logs(id!),
    enabled: !!id,
  })

  // Mutations
  const completeMutation = useMutation({
    mutationFn: (tid: string) => api.tasks.complete(tid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const failMutation = useMutation({
    mutationFn: (tid: string) => api.tasks.fail(tid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const heartbeatMutation = useMutation({
    mutationFn: (tid: string) => api.tasks.heartbeat(tid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', id] }),
  })

  // Resolver maps
  const memberMap = Object.fromEntries((membersData?.members ?? []).map((m: { id: number; nombre: string }) => [m.id, m]))
  const projectName = projectData?.nombre_proyecto ?? task?.project?.nombre_proyecto ?? '—'

  if (isLoading) return <div className="p-6 text-center text-[#5f5f5d]">Cargando tarea...</div>
  if (!task) return <div className="p-6 text-center text-[#5f5f5d]">Tarea no encontrada</div>

  const statusInfo = TASK_STATUSES[task.status]
  const priorityInfo = PRIORITIES[task.priority]

  // Use the task-level project name if available
  const resolvedProjectName = task.project?.nombre_proyecto || projectName

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
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
            {resolvedProjectName && (
              <span className="text-xs text-[#5f5f5d] flex items-center gap-1">
                <Package className="h-3 w-3" />
                {resolvedProjectName}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{task.title}</h1>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {task.status !== 'COMPLETADA' && (
          <Button
            onClick={() => completeMutation.mutate(String(task.id))}
            variant="surface"
            size="sm"
            disabled={completeMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" /> Completar
          </Button>
        )}
        {task.status !== 'BLOQUEADA' && (
          <Button
            onClick={() => failMutation.mutate(String(task.id))}
            variant="ghost"
            size="sm"
            disabled={failMutation.isPending}
          >
            <AlertCircle className="h-4 w-4" /> Bloquear
          </Button>
        )}
        {task.status === 'EN_PROGRESO' && (
          <Button
            onClick={() => heartbeatMutation.mutate(String(task.id))}
            variant="ghost"
            size="sm"
            disabled={heartbeatMutation.isPending}
          >
            <Clock className="h-4 w-4" /> Heartbeat
          </Button>
        )}
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="events">Eventos ({eventsData?.events?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logsData?.logs?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* === TAB: Info === */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Left — main content */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="space-y-4 pt-4">
                  {task.description && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Descripción</div>
                      <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}
                  {task.expected_output && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Resultado esperado</div>
                      <p className="text-sm whitespace-pre-wrap">{task.expected_output}</p>
                    </div>
                  )}
                  {task.acceptance_criteria && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Criterios de aceptación</div>
                      <p className="text-sm whitespace-pre-wrap">{task.acceptance_criteria}</p>
                    </div>
                  )}
                  {task.human_notes && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Notas humanas</div>
                      <p className="text-sm whitespace-pre-wrap">{task.human_notes}</p>
                    </div>
                  )}
                  {task.agent_notes && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">Notas del agente</div>
                      <p className="text-sm whitespace-pre-wrap">{task.agent_notes}</p>
                    </div>
                  )}
                  {!task.description && !task.expected_output && !task.acceptance_criteria &&
                   !task.human_notes && !task.agent_notes && (
                    <p className="text-sm text-[#5f5f5d]">Sin descripción</p>
                  )}
                </CardContent>
              </Card>

              {/* Context data */}
              {task.context_data && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Contexto para IA</div>
                    <pre className="text-xs bg-[#1c1c1c] text-[#f7f4ed] rounded-md p-3 overflow-auto max-h-64">
                      {JSON.stringify(task.context_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Result payload */}
              {task.result_payload && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Resultado final</div>
                    <pre className="text-xs bg-[#eceae4] rounded-md p-3 overflow-auto max-h-64">
                      {JSON.stringify(task.result_payload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Error message */}
              {task.error_message && (
                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">Mensaje de error</div>
                    <p className="text-sm text-red-700 whitespace-pre-wrap">{task.error_message}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right — metadata */}
            <div className="space-y-4">
              {/* Assignment */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Asignación</div>
                  {[
                    { label: 'Asignado', value: task.assigned_member_id ? memberMap[task.assigned_member_id]?.nombre : null },
                    { label: 'Responsable', value: task.responsible_member_id ? memberMap[task.responsible_member_id]?.nombre : null },
                    { label: 'Revisor', value: task.reviewer_member_id ? memberMap[task.reviewer_member_id]?.nombre : null },
                    { label: 'Creado por', value: task.created_by_member_id ? memberMap[task.created_by_member_id]?.nombre : null },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-[#5f5f5d] shrink-0" />
                      <span className="text-[#5f5f5d] w-24 shrink-0">{label}:</span>
                      <span className={value ? 'font-medium' : 'text-[#bab8b3]'}>
                        {value ?? '—'}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Times */}
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
                      <Clock className="h-4 w-4 text-[#5f5f5d] shrink-0" />
                      <span className="text-[#5f5f5d] w-32 shrink-0">{label}:</span>
                      <span className="text-[#5f5f5d]">
                        {value
                          ? new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Task metadata */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Metadatos</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#5f5f5d] w-32 shrink-0">Tipo:</span>
                    <span className="font-medium">{task.task_type}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#5f5f5d] w-32 shrink-0">Fecha límite:</span>
                      <span>{new Date(task.due_date).toLocaleDateString('es-CO')}</span>
                    </div>
                  )}
                  {task.source && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#5f5f5d] w-32 shrink-0">Source:</span>
                      <span className="font-mono text-xs">{task.source}</span>
                    </div>
                  )}
                  {task.worker_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#5f5f5d] w-32 shrink-0">Worker:</span>
                      <span className="font-mono text-xs">{task.worker_id}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#5f5f5d] w-32 shrink-0">Retries:</span>
                    <span>{task.retry_count} / {task.max_retries}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Lease info */}
              {task.lease_expires_at && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">Lease</div>
                    <div className="text-sm">
                      <span className="text-[#5f5f5d]">Expira: </span>
                      <span className="font-medium">
                        {new Date(task.lease_expires_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* === TAB: Events === */}
        <TabsContent value="events">
          <Card>
            <CardContent className="pt-4">
              {(!eventsData?.events || eventsData.events.length === 0) ? (
                <p className="text-sm text-[#5f5f5d]">Sin eventos</p>
              ) : (
                <div className="relative space-y-0">
                  {eventsData.events.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5"
                          style={{ backgroundColor: index === 0 ? '#22c55e' : '#3b82f6' }}
                        />
                        {index < eventsData.events.length - 1 && (
                          <div className="w-px flex-1 bg-[#eceae4] my-1" />
                        )}
                      </div>
                      {/* Event content */}
                      <div className="pb-5">
                        <div className="text-xs text-[#5f5f5d]">
                          {new Date(event.created_at).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                        <div className="text-sm font-semibold mt-0.5">{event.event_type}</div>
                        <div className="text-sm text-[#5f5f5d] mt-0.5">{event.message}</div>
                        {event.old_status && event.new_status && (
                          <div className="text-xs text-[#bab8b3] mt-0.5">
                            {event.old_status} → {event.new_status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB: Logs === */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-4">
              {(!logsData?.logs || logsData.logs.length === 0) ? (
                <p className="text-sm text-[#5f5f5d]">Sin logs</p>
              ) : (
                <pre className="text-xs bg-[#1c1c1c] text-[#f7f4ed] rounded-md p-4 overflow-auto max-h-[500px]">
                  {logsData.logs.map((log) => {
                    const ts = new Date(log.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    return `[${ts}] [${log.log_level}] ${log.message}`
                  }).join('\n')}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}