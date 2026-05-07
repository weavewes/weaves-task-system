import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ListChecks, Users, FolderOpen, Plus, Hexagon } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tareas', icon: ListChecks, label: 'Tareas' },
  { to: '/miembros', icon: Users, label: 'Miembros' },
  { to: '/proyectos', icon: FolderOpen, label: 'Proyectos' },
  { to: '/tareas/nueva', icon: Plus, label: 'Nueva Tarea' },
]

export function Header() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-[#eceae4] bg-[#f7f4ed]">
      <div className="flex h-14 items-center px-6 gap-1">
        <Link to="/" className="flex items-center gap-2 mr-6">
          <Hexagon className="h-6 w-6 text-[#1c1c1c]" />
          <span className="font-semibold text-[#1c1c1c] tracking-tight">Weaves Tasks</span>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                location.pathname === to
                  ? 'bg-[#1c1c1c] text-[#fcfbf8]'
                  : 'text-[#5f5f5d] hover:bg-[rgba(28,28,28,0.05)]'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <Header />
      <main className="p-6">{children}</main>
    </div>
  )
}
