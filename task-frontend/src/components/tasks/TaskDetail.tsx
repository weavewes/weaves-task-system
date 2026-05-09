import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TASK_STATUSES, PRIORITIES } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, User, AlertCircle, CheckCircle, Package, FileText, FileJson, FileCode, Image, File, Download, Eye, Hash, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

// Output type helpers
const outputTypeConfig = (type: string) => {
  switch (type) {
    case 'TEXT':        return { icon: <FileText className="h-4 w-4" />, label: 'Texto', color: '#3b82f6' }
    case 'MARKDOWN':    return { icon: <FileCode className="h-4 w-4" />, label: 'Markdown', color: '#8b5cf6' }
    case 'JSON':        return { icon: <FileJson className="h-4 w-4" />, label: 'JSON', color: '#f59e0b' }
    case 'IMAGE_URL':   return { icon: <Image className="h-4 w-4" />, label: 'Imagen', color: '#10b981' }
    case 'DOCUMENT_URL':return { icon: <File className="h-4 w-4" />, label: 'Documento', color: '#ef4444' }
    case 'FILE_URL':    return { icon: <File className="h-4 w-4" />, label: 'Archivo', color: '#6366f1' }
    case 'FILE_PATH':   return { icon: <File className="h-4 w-4" />, label: 'Archivo', color: '#6366f1' }
    case 'SUMMARY':     return { icon: <FileText className="h-4 w-4" />, label: 'Resumen', color: '#3b82f6' }
    case 'BRIEF':       return { icon: <FileText className="h-4 w-4" />, label: 'Brief', color: '#ec4899' }
    case 'REPORT':      return { icon: <FileText className="h-4 w-4" />, label: 'Reporte', color: '#14b8a6' }
    default:           return { icon: <File className="h-4 w-4" />, label: type, color: '#5f5f5d' }
  }
}

type OutputItem = {
  id?: number
  title?: string | null
  content?: string | null
  output_type: string
  file_url?: string | null
  file_path?: string | null
  created_at: string
  source_task_id?: number
  source_task_title?: string
  created_by?: string
}

// Single output card (used for both task outputs and dependency outputs)
function OutputCard({
  output,
  taskId,
  onPreview,
}: {
  output: OutputItem
  taskId: number
  onPreview: (o: OutputItem) => void
}) {
  const cfg = outputTypeConfig(output.output_type)
  const hasContent = !!(output.content && output.content.length > 0)
  const hasFile = !!(output.file_url || output.file_path)
  const PREVIEW_LEN = 200
  const truncated = hasContent && output.content!.length > PREVIEW_LEN
  const canDownload = hasContent || hasFile

  return (
    <div className="border border-[#eceae4] rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
          <span className="font-medium text-sm">{output.title || `Output #${output.id}`}</span>
          <Badge
            variant="secondary"
            style={{ color: cfg.color, borderColor: cfg.color + '40', backgroundColor: cfg.color + '15' }}
          >
            {cfg.label}
          </Badge>
          {output.created_by && (
            <span className="text-xs text-[#bab8b3]">por {output.created_by}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#bab8b3]">
            {new Date(output.created_at).toLocaleString('es-CO', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => onPreview(output)} title="Ver contenido">
            <Eye className="h-4 w-4" />
          </Button>
          {canDownload && output.id && (
            <a
              href={api.tasks.outputs.downloadUrl(String(taskId), output.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" title="Descargar">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
      {hasContent && (
        <div className="text-xs text-[#5f5f5d] bg-[#f7f5f0] rounded px-3 py-2">
          {truncated ? (
            <>
              {output.content!.slice(0, PREVIEW_LEN)}…
              {' '}
              <button
                onClick={() => onPreview(output)}
                className="text-[#3b82f6] hover:underline"
              >
                Ver más
              </button>
            </>
          ) : (
            <span>{output.content}</span>
          )}
        </div>
      )}
      {output.file_url && (
        <div className="text-xs text-[#5f5f5d] flex items-center gap-1">
          <Hash className="h-3 w-3" /> URL:{' '}
          <a
            href={output.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3b82f6] hover:underline"
          >
            {output.file_url}
          </a>
        </div>
      )}
    </div>
  )
}

const OUTPUT_TYPES = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'MARKDOWN', label: 'Markdown' },
  { value: 'JSON', label: 'JSON' },
  { value: 'FILE_URL', label: 'URL de archivo' },
  { value: 'FILE_PATH', label: 'Ruta local' },
  { value: 'IMAGE_URL', label: 'URL de imagen' },
  { value: 'DOCUMENT_URL', label: 'URL de documento' },
  { value: 'SUMMARY', label: 'Resumen' },
  { value: 'BRIEF', label: 'Brief' },
  { value: 'REPORT', label: 'Reporte' },
] as const

type OutputType = (typeof OUTPUT_TYPES)[number]['value']

// Human output form — collapsed section in the outputs tab
function HumanOutputForm({
  task,
  memberMap,
  onSuccess,
}: {
  task: any
  memberMap: Record<number, { id: number; codigo: string; nombre: string }>
  onSuccess: () => void
}) {
  const taskId = task.id as number
  const [open, setOpen] = useState(true)
  const [title, setTitle] = useState('')
  const [outputType, setOutputType] = useState<OutputType>('TEXT')
  const [content, setContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [filePath, setFilePath] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Derive member_code from responsible or assigned member
  const responsibleId = task.responsible_member_id
  const assignedId = task.assigned_member_id
  const memberId = responsibleId || assignedId
  const member = memberId ? memberMap[memberId] : null
  const memberCode = member?.codigo ?? null
  const hasResponsible = !!memberCode

  const isUrlType = outputType === 'FILE_URL' || outputType === 'IMAGE_URL' || outputType === 'DOCUMENT_URL'
  const isPathType = outputType === 'FILE_PATH'

  const reset = () => {
    setTitle('')
    setOutputType('TEXT')
    setContent('')
    setFileUrl('')
    setFilePath('')
    setToast(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setToast({ msg: 'El título es obligatorio', ok: false })
      return
    }
    if (!memberCode) {
      setToast({ msg: 'No hay responsable asignado a esta tarea', ok: false })
      return
    }
    if (!content.trim() && !fileUrl.trim() && !filePath.trim()) {
      setToast({ msg: 'Agrega contenido o una URL/ruta', ok: false })
      return
    }

    setSaving(true)
    setToast(null)
    try {
      await api.tasks.outputs.create(String(taskId), {
        member_code: memberCode.trim(),
        output_type: outputType,
        title: title.trim(),
        content: content.trim() || undefined,
        file_url: fileUrl.trim() || undefined,
        file_path: filePath.trim() || undefined,
      })
      setToast({ msg: 'Output guardado correctamente', ok: true })
      reset()
      onSuccess()
    } catch {
      setToast({ msg: 'Error al guardar. Intenta de nuevo.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-[#eceae4] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-[rgba(28,28,28,0.03)] transition-colors"
      >
        <span className="flex items-center gap-1.5"><Plus className="w-4 h-4" /> Subir resultado como humano</span>
        <span className="text-[#5f5f5d]">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>

      {open && !hasResponsible && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50/50 p-4 border-t border-[#eceae4]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No hay responsable asignado a esta tarea. Asigna un responsable para poder subir resultados.</span>
        </div>
      )}

      {open && hasResponsible && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-[#eceae4] space-y-4 bg-[#f7f4ed]">
          <div className="text-xs text-[#5f5f5d] bg-[#eceae4] rounded px-3 py-2">
            Subiendo como: <span className="font-medium">{member?.nombre}</span> (<code>{memberCode}</code>)
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide">
              Título del entregable
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Propuesta de copy para hero section"
            />
          </div>

          {/* Output type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide">
              Tipo de output
            </label>
            <Select value={outputType} onValueChange={(v) => setOutputType(v as OutputType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_TYPES.map((ot) => (
                  <SelectItem key={ot.value} value={ot.value}>
                    {ot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content (for TEXT, MARKDOWN, JSON, SUMMARY, BRIEF, REPORT) */}
          {!isUrlType && !isPathType && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide">
                Contenido
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={outputType === 'JSON' ? '{"key": "value"}' : 'Escribe o pega tu entregable aquí...'}
                rows={5}
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* File URL (for FILE_URL, IMAGE_URL, DOCUMENT_URL) */}
          {isUrlType && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide">
                URL del archivo
              </label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          )}

          {/* File path (for FILE_PATH) */}
          {isPathType && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide">
                Ruta local
              </label>
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/home/hector/..."
              />
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div
              className={`text-sm px-3 py-2 rounded-md border ${
                toast.ok 
                  ? 'bg-green-50/60 border-green-200 text-green-700' 
                  : 'bg-red-50/60 border-red-200 text-red-600'
              }`}
            >
              {toast.msg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="surface" size="sm" disabled={saving || !hasResponsible}>
              {saving ? 'Guardando...' : 'Guardar output'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                reset()
                setOpen(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
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

  // Blocked-by task (bloqueada_por)
  const { data: blockedByTask } = useQuery({
    queryKey: ['task-blocked-by', task?.bloqueada_por],
    queryFn: () => api.tasks.get(String(task!.bloqueada_por)),
    enabled: !!task?.bloqueada_por,
  })

  // Tasks that this task blocks (desbloquea a)
  const { data: blockingTasks } = useQuery({
    queryKey: ['task-blocking', id],
    queryFn: () => api.tasks.blocking(id!),
    enabled: false,
  })

  // Task outputs
  const { data: outputsData } = useQuery({
    queryKey: ['task-outputs', id],
    queryFn: () => api.tasks.outputs.list(id!),
    enabled: !!id,
  })

  // Dependency outputs
  const { data: depOutputsData } = useQuery({
    queryKey: ['task-dep-outputs', id],
    queryFn: () => api.tasks.outputs.dependencyList(id!),
    enabled: !!id,
  })

  // Preview modal state
  const [previewOutput, setPreviewOutput] = useState<OutputItem | null>(null)

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
  const memberMap: Record<number, { id: number; codigo: string; nombre: string }> = Object.fromEntries(
    (membersData?.members ?? []).map((m: { id: number; codigo: string; nombre: string }) => [m.id, m])
  )
  const projectName = projectData?.nombre_proyecto ?? task?.project?.nombre_proyecto ?? '—'

  if (isLoading) return <div className="p-6 text-center text-[#5f5f5d]">Cargando tarea...</div>
  if (!task) return <div className="p-6 text-center text-[#5f5f5d]">Tarea no encontrada</div>

  const statusInfo = TASK_STATUSES[task.status]
  const priorityInfo = PRIORITIES[task.priority]
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
              style={{
                backgroundColor: (priorityInfo?.color ?? '#5f5f5d') + '20',
                color: priorityInfo?.color ?? '#5f5f5d',
              }}
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
      <Tabs defaultValue={outputsData?.outputs?.length ? 'outputs' : 'info'}>
        <TabsList className="overflow-x-auto flex-nowrap pb-2 snap-x [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="outputs">
            Outputs ({outputsData?.outputs?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="dep-outputs">
            De dependencias ({depOutputsData?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="events">
            Eventos ({eventsData?.events?.length ?? 0})
          </TabsTrigger>
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
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">
                        Descripción
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}
                  {task.expected_output && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">
                        Resultado esperado
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{task.expected_output}</p>
                    </div>
                  )}
                  {task.acceptance_criteria && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">
                        Criterios de aceptación
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{task.acceptance_criteria}</p>
                    </div>
                  )}
                  {task.human_notes && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">
                        Notas humanas
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{task.human_notes}</p>
                    </div>
                  )}
                  {task.agent_notes && (
                    <div>
                      <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-1">
                        Notas del agente
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{task.agent_notes}</p>
                    </div>
                  )}
                  {!task.description &&
                    !task.expected_output &&
                    !task.acceptance_criteria &&
                    !task.human_notes &&
                    !task.agent_notes && (
                      <p className="text-sm text-[#5f5f5d]">Sin descripción</p>
                    )}
                </CardContent>
              </Card>

              {/* Context data */}
              {task.context_data && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                      Contexto para IA
                    </div>
                    <pre className="text-xs bg-[#1c1c1c] text-[#f7f4ed] rounded-md p-3 overflow-auto max-h-64">
                      {JSON.stringify(task.context_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Inputs (from previous task outputs) */}
              {task.input_payload && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                      Inputs (outputs de tareas anteriores)
                    </div>
                    <pre className="text-xs bg-[#eceae4] rounded-md p-3 overflow-auto max-h-64">
                      {JSON.stringify(task.input_payload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Result payload */}
              {task.result_payload && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                      Resultado final
                    </div>
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
                    <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                      Mensaje de error
                    </div>
                    <p className="text-sm text-red-700 whitespace-pre-wrap">
                      {task.error_message}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right — metadata */}
            <div className="space-y-4">
              {/* Assignment */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                    Asignación
                  </div>
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
                  <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                    Tiempos
                  </div>
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
                          ? new Date(value).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Dependencies */}
              {(task.bloqueada_por || (blockingTasks?.items?.length ?? 0) > 0) && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                      Dependencias
                    </div>
                    {task.bloqueada_por && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#5f5f5d] w-36 shrink-0">Bloqueada por:</span>
                        <span className="font-medium">
                          {blockedByTask ? (
                            <button
                              onClick={() => navigate(`/tasks/${blockedByTask.id}`)}
                              className="text-[#3b82f6] hover:underline"
                            >
                              {blockedByTask.codigo} — {blockedByTask.title}
                            </button>
                          ) : (
                            `#${task.bloqueada_por}`
                          )}
                        </span>
                      </div>
                    )}
                    {(blockingTasks?.items?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#5f5f5d] w-36 shrink-0">Desbloquea a:</span>
                        <span className="font-medium">
                          {blockingTasks?.items?.map(
                            (t: { id: number; codigo: string; title: string }) => (
                              <button
                                key={t.id}
                                onClick={() => navigate(`/tasks/${t.id}`)}
                                className="text-[#3b82f6] hover:underline mr-2"
                              >
                                {t.codigo}
                              </button>
                            )
                          )}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Task metadata */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                    Metadatos
                  </div>
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
                    <span>
                      {task.retry_count} / {task.max_retries}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Lease info */}
              {task.lease_expires_at && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wide mb-2">
                      Lease
                    </div>
                    <div className="text-sm">
                      <span className="text-[#5f5f5d]">Expira: </span>
                      <span className="font-medium">
                        {new Date(task.lease_expires_at).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* === TAB: Outputs === */}
        <TabsContent value="outputs">
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Human upload form */}
              <HumanOutputForm
                task={task}
                memberMap={memberMap}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['task-outputs', id] })}
              />


              {/* Existing outputs */}
              {!outputsData?.outputs || outputsData.outputs.length === 0 ? (
                <p className="text-sm text-[#5f5f5d]">
                  Sin outputs — esta tarea aún no tiene outputs registrados.
                </p>
              ) : (
                <div className="space-y-3">
                  {outputsData.outputs.map((output) => (
                    <OutputCard
                      key={output.id}
                      output={output as OutputItem}
                      taskId={task.id as number}
                      onPreview={setPreviewOutput}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB: Dep Outputs === */}
        <TabsContent value="dep-outputs">
          <Card>
            <CardContent className="pt-4">
              {!depOutputsData || depOutputsData.length === 0 ? (
                <p className="text-sm text-[#5f5f5d]">
                  Sin outputs de dependencias — ninguna tarea anterior ha registrado outputs.
                </p>
              ) : (
                <div className="space-y-4">
                  {depOutputsData.map((output) => (
                    <OutputCard
                      key={`${output.source_task_id}-${output.output_type}-${output.title}`}
                      output={output as OutputItem}
                      taskId={task.id as number}
                      onPreview={setPreviewOutput}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB: Events === */}
        <TabsContent value="events">
          <Card>
            <CardContent className="pt-4">
              {!eventsData?.events || eventsData.events.length === 0 ? (
                <p className="text-sm text-[#5f5f5d]">Sin eventos</p>
              ) : (
                <div className="relative space-y-0">
                  {eventsData.events.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5"
                          style={{
                            backgroundColor:
                              index === 0 ? '#22c55e' : '#3b82f6',
                          }}
                        />
                        {index < eventsData.events.length - 1 && (
                          <div className="w-px flex-1 bg-[#eceae4] my-1" />
                        )}
                      </div>
                      <div className="pb-5">
                        <div className="text-xs text-[#5f5f5d]">
                          {new Date(event.created_at).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                        <div className="text-sm font-semibold mt-0.5">
                          {event.event_type}
                        </div>
                        <div className="text-sm text-[#5f5f5d] mt-0.5">
                          {event.message}
                        </div>
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
              {!logsData?.logs || logsData.logs.length === 0 ? (
                <p className="text-sm text-[#5f5f5d]">Sin logs</p>
              ) : (
                <pre className="text-xs bg-[#1c1c1c] text-[#f7f4ed] rounded-md p-4 overflow-auto max-h-[500px]">
                  {logsData.logs.map((log) => {
                    const ts = new Date(log.created_at).toLocaleTimeString(
                      'es-CO',
                      { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                    )
                    return `[${ts}] [${log.log_level}] ${log.message}`
                  }).join('\n')}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output preview modal */}
      {previewOutput && (
        <Dialog open={!!previewOutput} onOpenChange={() => setPreviewOutput(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span style={{ color: outputTypeConfig(previewOutput.output_type).color }}>
                  {outputTypeConfig(previewOutput.output_type).icon}
                </span>
                {previewOutput.title || outputTypeConfig(previewOutput.output_type).label}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {previewOutput.output_type === 'JSON' ? (
                <pre className="text-xs bg-[#1c1c1c] text-[#f7f4ed] rounded-md p-4 overflow-auto">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(previewOutput.content || '{}'), null, 2)
                    } catch {
                      return previewOutput.content
                    }
                  })()}
                </pre>
              ) : previewOutput.output_type === 'MARKDOWN' ? (
                <pre className="text-sm whitespace-pre-wrap">{previewOutput.content}</pre>
              ) : previewOutput.file_url && !previewOutput.content ? (
                <div className="space-y-4">
                  <div className="text-sm text-[#5f5f5d]">Archivo externo disponible:</div>
                  <a
                    href={previewOutput.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#3b82f6] hover:underline"
                  >
                    <Download className="h-4 w-4" /> {previewOutput.file_url}
                  </a>
                </div>
              ) : (
                <pre className="text-sm whitespace-pre-wrap">{previewOutput.content}</pre>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[#eceae4]">
              {(previewOutput.content || previewOutput.file_url) && (
                <a
                  href={
                    previewOutput.file_url
                      ? previewOutput.file_url
                      : `data:text/plain;charset=utf-8,${encodeURIComponent(previewOutput.content || '')}`
                  }
                  download={
                    previewOutput.file_url
                      ? undefined
                      : `output-${previewOutput.output_type.toLowerCase()}.txt`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="surface" size="sm">
                    <Download className="h-4 w-4" /> Descargar
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setPreviewOutput(null)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
