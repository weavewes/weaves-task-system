import { Link, useLocation } from 'react-router-dom'
import { ListTodo, User, Plus, Folder, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/mobile/tareas', icon: ListTodo, label: 'Tareas' },
  { to: '/mobile/mis-tareas', icon: User, label: 'Mis Tareas' },
  { to: '/tareas/nueva', icon: Plus, label: 'Crear', isFab: true },
  { to: '/mobile/proyectos', icon: Folder, label: 'Proyectos' },
  { to: '/mobile/mas', icon: MoreHorizontal, label: 'Más' },
]

export function BottomNav() {
  const location = useLocation()

  // Active check: matches path or is parent of current path
  const isActive = (to: string) => {
    if (to === '/mobile/tareas') {
      return location.pathname === '/mobile/tareas' || location.pathname === '/mobile/kamba'
    }
    return location.pathname.startsWith(to)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#f7f4ed] border-t border-[#eceae4]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 relative">
        {navItems.map(({ to, icon: Icon, label, isFab }) => {
          const active = isFab ? false : isActive(to)

          if (isFab) {
            return (
              <Link
                key={to}
                to={to}
                className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center justify-center"
                style={{ top: '-20px' }}
              >
                <div
                  className="w-14 h-14 rounded-full bg-[#1c1c1c] flex items-center justify-center shadow-lg"
                  style={{ boxShadow: '0 4px 16px rgba(28,28,28,0.25)' }}
                >
                  <Plus className="h-6 w-6 text-[#fcfbf8]" />
                </div>
                <span className="text-[10px] text-[#5f5f5d] mt-0.5 font-medium">Crear</span>
              </Link>
            )
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 h-full flex-1',
                active
                  ? 'text-[#1c1c1c]'
                  : 'text-[#5f5f5d]'
              )}
            >
              {active ? (
                <div className="bg-[#1c1c1c] rounded-full px-3 py-1.5">
                  <Icon className="h-5 w-5 text-[#fcfbf8]" />
                </div>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className={cn('text-[10px] font-medium', active && 'text-[#1c1c1c]')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <main className="p-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  )
}
