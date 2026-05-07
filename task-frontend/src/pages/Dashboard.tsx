import { StatsCards } from '@/components/dashboard/StatsCards'
import { RecentTasks } from '@/components/dashboard/RecentTasks'
import type { TaskStatus } from '@/lib/types'

interface DashboardProps {
  onStatusFilter?: (status: TaskStatus | null) => void
  activeFilter?: TaskStatus | null
}

export function Dashboard({ onStatusFilter, activeFilter }: DashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#5f5f5d]">Resumen del sistema de tareas</p>
      </div>
      <StatsCards onStatusFilter={onStatusFilter} activeFilter={activeFilter} />
      <RecentTasks />
    </div>
  )
}
