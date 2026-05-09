import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { Dashboard } from '@/pages/Dashboard'
import { TaskList } from '@/pages/TaskList'
import { TaskCreate } from '@/pages/TaskCreate'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import { TaskDetailMockup } from '@/pages/TaskDetailMockup'
import { MemberView } from '@/pages/MemberView'
import { MemberTasks, ProjectView, ProjectDetail } from '@/pages/MemberProjectViews'
import { KambaView } from '@/pages/KambaView'
import { MobileTasks } from '@/pages/MobileTasks'
import { MobileKambaView } from '@/pages/MobileKambaView'
import { MobileProjects } from '@/pages/MobileProjects'
import { MobileMore } from '@/pages/MobileMore'

const queryClient = new QueryClient()

function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile ? <MobileLayout>{children}</MobileLayout> : <Layout>{children}</Layout>
}

function AppRoutes() {
  return (
    <ResponsiveLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tareas" element={<TaskList />} />
        <Route path="/tareas/nueva" element={<TaskCreate />} />
        <Route path="/tareas/:id" element={<TaskDetailPage />} />
        <Route path="/tareas/:id/mockup" element={<TaskDetailMockup />} />
        <Route path="/miembros" element={<MemberView />} />
        <Route path="/miembros/:code" element={<MemberTasks />} />
        <Route path="/proyectos" element={<ProjectView />} />
        <Route path="/proyectos/:id" element={<ProjectDetail />} />
        <Route path="/kamba" element={<KambaView />} />
        <Route path="/mobile/tareas" element={<MobileTasks />} />
        <Route path="/mobile/kamba" element={<MobileKambaView />} />
        <Route path="/mobile/proyectos" element={<MobileProjects />} />
        <Route path="/mobile/mas" element={<MobileMore />} />
        <Route path="/mobile/mis-tareas" element={<MemberTasks />} />
      </Routes>
    </ResponsiveLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
