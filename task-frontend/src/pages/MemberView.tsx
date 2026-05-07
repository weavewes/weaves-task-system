import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'

export function MemberView() {
  const navigate = useNavigate()
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.members.list(),
  })

  const members = membersData?.members ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Miembros</h1>
        <p className="text-sm text-[#5f5f5d]">Selecciona un miembro para ver sus tareas</p>
      </div>

      {isLoading ? (
        <p className="text-center text-[#5f5f5d] py-8">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {members.map(member => (
            <Card
              key={member.id}
              className="cursor-pointer hover:-translate-y-0.5 hover:shadow-[rgba(0,0,0,0.1)_0px_4px_12px] transition-all"
              onClick={() => navigate(`/miembros/${member.codigo}`)}
            >
              <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
                <div className="w-8 h-8 rounded-full bg-[#eceae4] flex items-center justify-center">
                  <User className="h-4 w-4 text-[#5f5f5d]" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm truncate">{member.nombre}</CardTitle>
                  <p className="text-xs text-[#5f5f5d] font-mono">{member.codigo}</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex gap-2 flex-wrap">
                <Badge variant={member.tipo_miembro === 'AGENTE' ? 'default' : 'secondary'} className="text-xs">
                  {member.tipo_miembro}
                </Badge>
                {member.area && (
                  <Badge variant="outline" className="text-xs">{member.area}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
