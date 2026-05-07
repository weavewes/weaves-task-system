import { TaskTable } from '@/components/tasks/TaskTable'
import { useSearchParams } from 'react-router-dom'

export function TaskList() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? undefined
  const projectId = searchParams.get('project_id') ?? undefined
  const memberId = searchParams.get('member_id') ?? undefined

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
        <p className="text-sm text-[#5f5f5d]">Lista de todas las tareas</p>
      </div>
      <TaskTable filters={{ status, project_id: projectId, member_id: memberId }} />
    </div>
  )
}
