import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Folder, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MobileProjects() {
  const navigate = useNavigate()

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const projects = projectsData?.items ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#1c1c1c]">Proyectos</h1>
        <p className="text-xs text-[#5f5f5d]">{projects.length} proyectos</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#5f5f5d] text-sm">
            Cargando...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#5f5f5d] text-sm">
            <Folder className="w-10 h-10 mb-3 opacity-30" />
            <span>No hay proyectos</span>
          </div>
        ) : (
          projects.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/proyectos/${project.id}`)}
              className="w-full text-left bg-[#fcfbf8] border border-[#eceae4] rounded-2xl p-4 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eceae4] flex items-center justify-center shrink-0">
                  <Folder className="w-5 h-5 text-[#5f5f5d]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#1c1c1c] leading-snug line-clamp-2 flex-1">
                      {project.nombre_proyecto}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-[#5f5f5d] shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#5f5f5d]">
                    <span className="font-mono">{project.codigo}</span>
                    {project.fecha_entrega_estimada && (
                      <span>Entrega: {formatDate(project.fecha_entrega_estimada)}</span>
                    )}
                  </div>
                  {project.descripcion && (
                    <p className="text-xs text-[#5f5f5d] mt-1.5 line-clamp-2">{project.descripcion}</p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
