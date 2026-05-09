import { Link } from 'react-router-dom'
import { Settings, User, HelpCircle, ChevronRight, Hexagon } from 'lucide-react'

const menuItems = [
  { icon: User, label: 'Perfil', to: '/miembros' },
  { icon: Settings, label: 'Ajustes', to: '#' },
  { icon: HelpCircle, label: 'Ayuda', to: '#' },
]

export function MobileMore() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Hexagon className="h-8 w-8 text-[#1c1c1c]" />
        <div>
          <h1 className="text-lg font-semibold text-[#1c1c1c]">Weaves Tasks</h1>
          <p className="text-xs text-[#5f5f5d]">Gestión de tareas</p>
        </div>
      </div>

      {/* Menu links */}
      <div className="bg-[#fcfbf8] border border-[#eceae4] rounded-2xl overflow-hidden">
        {menuItems.map(({ icon: Icon, label, to }, i) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 px-4 py-4 active:bg-[#eceae4] transition-colors"
            style={{ borderTop: i > 0 ? '1px solid #eceae4' : undefined }}
          >
            <Icon className="w-5 h-5 text-[#5f5f5d]" />
            <span className="text-sm font-medium text-[#1c1c1c] flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 text-[#5f5f5d]" />
          </Link>
        ))}
      </div>

      {/* Version */}
      <div className="text-center">
        <p className="text-xs text-[#5f5f5d]">Weaves Tasks v1.0</p>
        <p className="text-[10px] text-[#5f5f5d] mt-1">Hecho para móviles</p>
      </div>
    </div>
  )
}
