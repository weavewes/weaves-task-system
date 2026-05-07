import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { TaskList } from '@/pages/TaskList'
import { TaskCreate } from '@/pages/TaskCreate'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import { TaskDetailMockup } from '@/pages/TaskDetailMockup'
import { MemberView } from '@/pages/MemberView'
import { MemberTasks, ProjectView, ProjectDetail } from '@/pages/MemberProjectViews'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
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
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
