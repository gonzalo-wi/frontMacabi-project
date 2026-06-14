import { useMemo } from 'react'
import { LayoutDashboard } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { UserPanelJornadasBlock } from './UserPanelJornadasBlock'
import { UserPanelProjectsBlock } from './UserPanelProjectsBlock'
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
  const { user, token, isRestoring } = useAuth()

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
        {/* Mobile Welcome Card */}
        <header className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-5 shadow-premium lg:hidden relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/85 leading-none">{fechaStr}</p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">¡Hola, {saludoNombre}!</h1>
            <p className="text-xs text-muted-foreground leading-snug mt-1">{resumen}</p>
          </div>
        </header>

        {/* Desktop Welcome Card */}
        <div className="hidden lg:block rounded-2xl bg-gradient-to-r from-primary/8 via-primary/3 to-transparent border border-primary/10 p-6 space-y-3 shadow-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/85 leading-none">{fechaStr}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">¡Hola, {saludoNombre}!</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mt-1">{resumen}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 relative z-10">
            <Badge variant="secondary" className="font-semibold px-2.5 py-0.5 rounded-full text-xs">
              {membershipsQ.isPending ? '…' : `${membershipsCount} proyecto${membershipsCount === 1 ? '' : 's'}`}
            </Badge>
            <Badge variant="secondary" className="font-semibold px-2.5 py-0.5 rounded-full text-xs">
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
