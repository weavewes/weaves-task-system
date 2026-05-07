import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate, useParams } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { TaskTable } from '@/components/tasks/TaskTable'

export function ProjectView() {
  const navigate = useNavigate()
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const projects = projectsData?.items ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
        <p className="text-sm text-[#5f5f5d]">Selecciona un proyecto para ver sus tareas</p>
      </div>

      {isLoading ? (
        <p className="text-center text-[#5f5f5d] py-8">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Card
              key={project.id}
              className="cursor-pointer hover:-translate-y-0.5 hover:shadow-[rgba(0,0,0,0.1)_0px_4px_12px] transition-all"
              onClick={() => navigate(`/proyectos/${project.id}`)}
            >
              <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
                <FolderOpen className="h-5 w-5 text-[#5f5f5d]" />
                <div className="min-w-0">
                  <CardTitle className="text-sm truncate">{project.nombre_proyecto}</CardTitle>
                  <p className="text-xs text-[#5f5f5d] font-mono">{project.codigo}</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${project.estado_proyecto === 'ACTIVO' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#eceae4] text-[#5f5f5d]'}`}>
                    {project.estado_proyecto}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#eceae4] text-[#5f5f5d]">
                    {project.prioridad_proyecto}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tareas del Proyecto</h1>
        <p className="text-sm text-[#5f5f5d]">Tareas filtradas por proyecto</p>
      </div>
      <TaskTable filters={{ project_id: id }} />
    </div>
  )
}

export function MemberTasks() {
  const { code } = useParams<{ code: string }>()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tareas del Miembro</h1>
        <p className="text-sm text-[#5f5f5d]">Tareas filtradas por miembro: {code}</p>
      </div>
      <MemberTaskList code={code!} />
    </div>
  )
}

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TASK_STATUSES, PRIORITIES } from '@/lib/types'

function MemberTaskList({ code }: { code: string }) {
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['member-tasks', code, role, status],
    queryFn: () => api.members.tasks(code, role === 'all' ? undefined : role, status === 'all' ? undefined : status),
  })

  const tasks = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="assigned">Asignado</SelectItem>
            <SelectItem value="responsible">Responsable</SelectItem>
            <SelectItem value="reviewer">Revisor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(TASK_STATUSES).map(([k, { label }]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[#eceae4] bg-[#f7f4ed] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eceae4]">
              <th className="text-left py-3 px-4 font-medium text-[#5f5f5d]">Código</th>
              <th className="text-left py-3 px-4 font-medium text-[#5f5f5d]">Título</th>
              <th className="text-left py-3 px-4 font-medium text-[#5f5f5d]">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-[#5f5f5d]">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="py-8 text-center text-[#5f5f5d]">Cargando...</td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-[#5f5f5d]">Sin tareas</td></tr>
            ) : (
              tasks.map(task => (
                <tr key={task.id} className="border-b border-[#eceae4] last:border-0 hover:bg-[rgba(28,28,28,0.03)] cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/tareas/${task.id}`}>
                  <td className="py-3 px-4 font-mono text-xs">{task.codigo}</td>
                  <td className="py-3 px-4 text-sm font-medium">{task.title}</td>
                  <td className="py-3 px-4">
                    <Badge variant={
                      task.status === 'PENDIENTE' ? 'pendiente' :
                      task.status === 'EN_PROGRESO' ? 'progreso' :
                      task.status === 'ESPERANDO_HUMANO' ? 'esperando_humano' :
                      task.status === 'ESPERANDO_CLIENTE' ? 'esperando_cliente' :
                      task.status === 'BLOQUEADA' ? 'bloqueada' :
                      task.status === 'EN_REVISION' ? 'revision' :
                      task.status === 'COMPLETADA' ? 'completada' :
                      task.status === 'ERROR' ? 'error' : 'secondary'
                    } className="text-xs">
                      {TASK_STATUSES[task.status as keyof typeof TASK_STATUSES]?.label ?? task.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium" style={{ color: PRIORITIES[task.priority]?.color }}>
                      {PRIORITIES[task.priority]?.label}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
