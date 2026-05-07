import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TASK_TYPES } from '@/lib/types'

export function TaskCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: membersData } = useQuery({ queryKey: ['members'], queryFn: () => api.members.list() })
  const { data: projectsData } = useQuery({ queryKey: ['projects'], queryFn: () => api.projects.list() })
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => api.clients.list() })

  const members = membersData?.members ?? []
  const projects = projectsData?.items ?? []
  const clients = clientsData?.items ?? []

  const [form, setForm] = useState({
    title: '',
    description: '',
    expected_output: '',
    acceptance_criteria: '',
    cliente_id: '',
    proyecto_id: '',
    assigned_member_id: '',
    responsible_member_id: '',
    reviewer_member_id: '',
    priority: '3',
    tipo_tarea: 'DESARROLLO',
    due_date: '',
    context_data: '{}',
    human_notes: '',
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        expected_output: form.expected_output || null,
        acceptance_criteria: form.acceptance_criteria || null,
        priority: parseInt(form.priority),
        tipo_tarea: form.tipo_tarea,
        due_date: form.due_date || null,
        human_notes: form.human_notes || null,
        context_data: form.context_data && form.context_data !== '{}' ? JSON.parse(form.context_data) : null,
      }
      if (form.cliente_id) payload.cliente_id = form.cliente_id
      if (form.proyecto_id) payload.proyecto_id = form.proyecto_id
      if (form.assigned_member_id) payload.assigned_member_id = form.assigned_member_id
      if (form.responsible_member_id) payload.responsible_member_id = form.responsible_member_id
      if (form.reviewer_member_id) payload.reviewer_member_id = form.reviewer_member_id

      return api.tasks.create(payload as Parameters<typeof api.tasks.create>[0])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate('/tareas')
    },
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { value: string }) => {
    const val = 'value' in e ? e.value : e.target.value
    setForm(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Nueva Tarea</h1>
        <p className="text-sm text-[#5f5f5d]">Crea una nueva tarea en el sistema</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Información de la tarea</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input id="title" value={form.title} onChange={set('title')} placeholder="Título de la tarea" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={set('description')}
              placeholder="Descripción detallada"
              className="flex min-h-[80px] w-full rounded-md border border-[#eceae4] bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-[#5f5f5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm(p => ({ ...p, cliente_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre_del_cliente}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proyecto</Label>
              <Select value={form.proyecto_id} onValueChange={v => setForm(p => ({ ...p, proyecto_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nombre_proyecto}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Asignado a</Label>
              <Select value={form.assigned_member_id} onValueChange={v => setForm(p => ({ ...p, assigned_member_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Asignado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={form.responsible_member_id} onValueChange={v => setForm(p => ({ ...p, responsible_member_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Revisor</Label>
              <Select value={form.reviewer_member_id} onValueChange={v => setForm(p => ({ ...p, reviewer_member_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Revisor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Baja</SelectItem>
                  <SelectItem value="2">2 - Media baja</SelectItem>
                  <SelectItem value="3">3 - Media</SelectItem>
                  <SelectItem value="4">4 - Alta</SelectItem>
                  <SelectItem value="5">5 - Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de tarea</Label>
              <Select value={form.tipo_tarea} onValueChange={v => setForm(p => ({ ...p, tipo_tarea: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha límite</Label>
              <Input type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_output">Resultado esperado</Label>
            <textarea
              id="expected_output"
              value={form.expected_output}
              onChange={set('expected_output')}
              placeholder="¿Qué resultado se espera?"
              className="flex min-h-[60px] w-full rounded-md border border-[#eceae4] bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-[#5f5f5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceptance_criteria">Criterios de aceptación</Label>
            <textarea
              id="acceptance_criteria"
              value={form.acceptance_criteria}
              onChange={set('acceptance_criteria')}
              placeholder="¿Cuáles son los criterios para considerar la tarea completa?"
              className="flex min-h-[60px] w-full rounded-md border border-[#eceae4] bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-[#5f5f5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="human_notes">Notas humanas</Label>
            <textarea
              id="human_notes"
              value={form.human_notes}
              onChange={set('human_notes')}
              placeholder="Notas adicionales..."
              className="flex min-h-[60px] w-full rounded-md border border-[#eceae4] bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-[#5f5f5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent_context">Contexto para IA (JSON)</Label>
            <Input id="agent_context" value={form.context_data} onChange={set('context_data')} placeholder='{"key": "value"}' />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Tarea'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
