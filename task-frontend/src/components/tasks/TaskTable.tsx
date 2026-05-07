import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TASK_STATUSES, PRIORITIES, type Task } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

const columnHelper = createColumnHelper<Task>()

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

interface TaskTableProps {
  filters?: { status?: string; project_id?: string; member_id?: string }
}

export function TaskTable({ filters }: TaskTableProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState(filters?.status ?? 'all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.tasks.list({
      status: filters?.status,
      project_id: filters?.project_id,
      member_id: filters?.member_id,
    }),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.tasks.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const failMutation = useMutation({
    mutationFn: (id: string) => api.tasks.fail(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const tasks = tasksData?.items ?? []
  const members = membersData?.members ?? []
  const projects = projectsData?.items ?? []

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const columns = [
    columnHelper.accessor('codigo', {
      header: 'Código',
      cell: info => <span className="font-mono text-xs text-[#5f5f5d]">{info.getValue()}</span>,
    }),
    columnHelper.accessor('title', {
      header: 'Título',
      cell: info => <span className="text-sm font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: info => (
        <Badge variant={statusVariant(info.getValue())} className="text-xs">
          {TASK_STATUSES[info.getValue()]?.label ?? info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Prioridad',
      cell: info => {
        const p = PRIORITIES[info.getValue()]
        return (
          <span className="text-xs font-medium" style={{ color: p?.color }}>
            {p?.label ?? info.getValue()}
          </span>
        )
      },
    }),
    columnHelper.accessor('assigned_member_id', {
      header: 'Asignado',
      cell: info => {
        const mid = info.getValue()
        const m = mid ? memberMap[mid] : null
        return <span className="text-xs">{m?.nombre ?? '—'}</span>
      },
    }),
    columnHelper.accessor('project_id', {
      header: 'Proyecto',
      cell: info => {
        const pid = info.getValue()
        const p = pid ? projectMap[pid] : null
        return <span className="text-xs truncate">{p?.nombre_proyecto ?? '—'}</span>
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/tareas/${info.row.original.id}`)}>
              Ver detalle
            </DropdownMenuItem>
            {info.row.original.status !== 'COMPLETADA' && (
              <DropdownMenuItem onClick={() => completeMutation.mutate(String(info.row.original.id))}>
                Completar
              </DropdownMenuItem>
            )}
            {info.row.original.status !== 'BLOQUEADA' && (
              <DropdownMenuItem onClick={() => failMutation.mutate(String(info.row.original.id))}>
                Bloquear
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ]

  const table = useReactTable({
    data: tasks,
    columns,
    state: { globalFilter },
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Buscar tareas..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(TASK_STATUSES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(PRIORITIES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="surface" size="sm" onClick={() => navigate('/tareas/nueva')}>
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#eceae4] bg-[#f7f4ed] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-[#eceae4]">
                {hg.headers.map(header => (
                  <th key={header.id} className="text-left py-3 px-4 font-medium text-[#5f5f5d]">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length} className="py-8 text-center text-[#5f5f5d]">Cargando...</td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="py-8 text-center text-[#5f5f5d]">No hay tareas</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-[#eceae4] last:border-0 hover:bg-[rgba(28,28,28,0.03)] cursor-pointer transition-colors"
                  onClick={() => navigate(`/tareas/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-3 px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
