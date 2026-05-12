import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, User } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserPanelJornadasBlock } from '@/features/panel/UserPanelJornadasBlock'
import { UserPanelProjectsBlock } from '@/features/panel/UserPanelProjectsBlock'
import { useUserEventResponsesMap } from '@/features/events/hooks/useUserEventResponsesMap'
import { useUserRelevantUpcomingEvents } from '@/features/events/hooks/useUserRelevantUpcomingEvents'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { useAuth } from '@/hooks/useAuth'

function greetingName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0]
  return first || fullName
}

/** Fecha tipo "lunes 11 de mayo" (solo mayúscula inicial). */
function greetingDateEsAR() {
  const s = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Resumen gramatical: evita "1 proyectos" / "1 próximas". */
function summaryLine(
  membershipsPending: boolean,
  upcomingPending: boolean,
  membershipsCount: number,
  upcomingCount: number,
): string {
  if (membershipsPending || upcomingPending) {
    return 'Cargando tus datos…'
  }
  const proy =
    membershipsCount === 0
      ? 'no tenés proyectos cargados todavía'
      : membershipsCount === 1
        ? 'integrás 1 proyecto'
        : `integrás ${membershipsCount} proyectos`
  const jor =
    upcomingCount === 0
      ? 'no hay próximas jornadas en la lista por ahora'
      : upcomingCount === 1
        ? 'hay 1 próxima jornada para revisar abajo'
        : `hay ${upcomingCount} próximas jornadas para revisar abajo`
  return `${proy.charAt(0).toUpperCase() + proy.slice(1)}; ${jor}.`
}

export default function PanelPage() {
  const navigate = useNavigate()
  const { user, logout, token, isRestoring } = useAuth()

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const upcomingQ = useUserRelevantUpcomingEvents(
    token,
    user?.id,
    membershipsQ.data,
    membershipsQ.isSuccess,
    isRestoring,
  )

  const eventIds = useMemo(() => upcomingQ.data?.events.map((e) => e.instance.id) ?? [], [upcomingQ.data])
  const responseMap = useUserEventResponsesMap(token, eventIds, Boolean(token && upcomingQ.isSuccess))

  const upcomingCount = upcomingQ.data?.events.length ?? 0
  const membershipsCount = membershipsQ.data?.length ?? 0

  const resumen = useMemo(
    () =>
      summaryLine(
        membershipsQ.isPending,
        upcomingQ.isPending,
        membershipsCount,
        upcomingCount,
      ),
    [membershipsQ.isPending, upcomingQ.isPending, membershipsCount, upcomingCount],
  )

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  if (!user) return null

  const saludoNombre = greetingName(user.name)
  const fechaStr = greetingDateEsAR()

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={LayoutDashboard}
        title="Panel"
        subtitle={`Hola, ${saludoNombre} — resumen rápido`}
      />

      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 lg:space-y-8">
        <header className="flex items-start justify-between gap-4 lg:hidden">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-muted-foreground">{fechaStr}</p>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Hola, {saludoNombre}</h1>
            <p className="text-sm text-muted-foreground leading-snug">{resumen}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="focus:outline-none shrink-0">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {user.name}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="hidden lg:block space-y-3">
          <p className="text-sm text-muted-foreground">{fechaStr}</p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Hola, {saludoNombre}</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{resumen}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="font-normal">
              {membershipsQ.isPending ? '…' : `${membershipsCount} proyecto${membershipsCount === 1 ? '' : 's'}`}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {upcomingQ.isPending ? '…' : `${upcomingCount} próx. jornada${upcomingCount === 1 ? '' : 's'}`}
            </Badge>
          </div>
        </div>

        <div className="space-y-8">
          <UserPanelProjectsBlock memberships={membershipsQ.data} isLoading={membershipsQ.isPending} />
          <UserPanelJornadasBlock upcomingQ={upcomingQ} responseMap={responseMap} />
        </div>
      </div>
    </div>
  )
}
