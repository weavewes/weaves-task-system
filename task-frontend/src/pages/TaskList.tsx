import { TaskTable } from '@/components/tasks/TaskTable'
import { KambaView } from '@/pages/KambaView'
import { useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List } from 'lucide-react'

type ViewMode = 'list' | 'kamba'

export function TaskList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? undefined
  const projectId = searchParams.get('project_id') ?? undefined
  const memberId = searchParams.get('member_id') ?? undefined

  // Persist view mode in URL so it survives back navigation
  const urlView = searchParams.get('view') as ViewMode | null
  const [viewMode, setViewModeState] = useState<ViewMode>(urlView ?? 'list')

  // Sync view mode to URL when changed
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (mode === 'list') {
        next.delete('view')
      } else {
        next.set('view', mode)
      }
      return next
    }, { replace: true })
  }

  // Sync from URL on mount (back navigation)
  useEffect(() => {
    if (urlView === 'list' || urlView === 'kamba') {
      setViewModeState(urlView)
    }
  }, [urlView])

  const filters = { status, project_id: projectId, member_id: memberId }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-sm text-[#5f5f5d]">
            {viewMode === 'kamba' ? 'Vista Kanban' : 'Lista de todas las tareas'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#eceae4] p-0.5 rounded-lg">
          <Button
            variant={viewMode === 'list' ? 'surface' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1.5" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'kamba' ? 'surface' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kamba')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Kamba
          </Button>
        </div>
      </div>

      {viewMode === 'kamba' ? (
        <KambaView inlineFilters={filters} />
      ) : (
        <TaskTable filters={filters} />
      )}
    </div>
  )
}