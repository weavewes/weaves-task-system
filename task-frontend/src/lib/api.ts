const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// Members
export const api = {
  health: () => request<{ service: string; version: string }>('/health'),

  members: {
    list: () => request<{ total: number; members: import('./types').Member[] }>('/members'),
    byCode: (code: string) =>
      request<import('./types').Member>(`/members/code/${code}`),
    tasks: (code: string, role?: string, status?: string) => {
      const params = new URLSearchParams()
      if (role) params.set('role', role)
      if (status) params.set('status', status)
      const qs = params.toString() ? `?${params}` : ''
      return request<{ total: number; items: import('./types').Task[] }>(
        `/members/code/${code}/tasks${qs}`
      )
    },
  },

  // Tasks
  tasks: {
    list: (filters?: { status?: string; priority?: number; project_id?: string; member_id?: string }) => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', String(filters.priority))
      if (filters?.project_id) params.set('project_id', filters.project_id)
      if (filters?.member_id) params.set('member_id', filters.member_id)
      const qs = params.toString() ? `?${params}` : ''
      return request<{ total: number; items: import('./types').Task[] }>(`/tasks${qs}`)
    },
    get: (id: string) => request<import('./types').Task>(`/tasks/${id}`),
    create: (data: Partial<import('./types').Task>) =>
      request<import('./types').Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    claimNext: () => request<import('./types').Task>('/tasks/claim-next', { method: 'POST' }),
    heartbeat: (id: string) =>
      request<{ ok: boolean }>(`/tasks/${id}/heartbeat`, { method: 'POST' }),
    complete: (id: string, finalResult?: Record<string, unknown>) =>
      request<import('./types').Task>(`/tasks/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ final_result: finalResult }),
      }),
    fail: (id: string, error?: string) =>
      request<import('./types').Task>(`/tasks/${id}/fail`, {
        method: 'POST',
        body: JSON.stringify({ error }),
      }),
    events: (id: string) =>
      request<import('./types').EventsResponse>(`/tasks/${id}/events`),
    logs: (id: string) =>
      request<import('./types').LogsResponse>(`/tasks/${id}/logs`),
  },

  // Projects
  projects: {
    list: () => request<{ total: number; items: import('./types').Project[] }>('/projects'),
    byClient: (clientId: string) =>
      request<{ total: number; items: import('./types').Project[] }>(`/projects/by-client/${clientId}`),
    byId: (id: string) => request<import('./types').Project>(`/projects/${id}`),
  },

  // Clients
  clients: {
    list: () => request<{ total: number; items: import('./types').Client[] }>('/clients'),
    byId: (id: string) => request<import('./types').Client>(`/clients/${id}`),
    create: (data: Partial<import('./types').Client>) =>
      request<import('./types').Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Nexus wrapper
  nexus: {
    assignTask: (taskId: string, assignedId: string, responsibleId?: string) =>
      request<{ ok: boolean }>('/nexus/assign-task', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, assigned_id: assignedId, responsible_id: responsibleId }),
      }),
  },
}
