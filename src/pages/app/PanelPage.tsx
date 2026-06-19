import { LayoutDashboard } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { usePanelPage } from '@/features/dashboard/hooks/usePanelPage'
import { UserPanelJornadasBlock } from '@/features/events/components/UserPanelJornadasBlock'
import { UserPanelProjectsBlock } from '@/features/projects/components/UserPanelProjectsBlock'
import { LatestNewsBlock } from '@/features/news/components/LatestNewsBlock'
import { useAuth } from '@/hooks/useAuth'

export default function PanelPage() {
  const { user, token, isRestoring } = useAuth()

  const {
    membershipsQ,
    upcomingQ,
    responseMap,
    upcomingCount,
    membershipsCount,
    resumen,
    saludoNombre,
    fechaStr,
  } = usePanelPage({
    token,
    userId: user?.id,
    userName: user?.name,
    isRestoring,
  })

  if (!user) return null

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={LayoutDashboard}
        title="Panel"
        subtitle={`Hola, ${saludoNombre} — resumen rápido`}
      />

      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 lg:space-y-8">
        <header className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-5 shadow-premium lg:hidden relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/85 leading-none">{fechaStr}</p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">¡Hola, {saludoNombre}!</h1>
            <p className="text-xs text-muted-foreground leading-snug mt-1">{resumen}</p>
          </div>
        </header>

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
          {token && <LatestNewsBlock token={token} />}
          <UserPanelProjectsBlock memberships={membershipsQ.data} isLoading={membershipsQ.isPending} />
          <UserPanelJornadasBlock upcomingQ={upcomingQ} responseMap={responseMap} />
        </div>
      </div>
    </div>
  )
}
