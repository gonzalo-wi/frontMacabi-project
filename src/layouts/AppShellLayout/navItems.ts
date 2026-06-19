import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Newspaper,
  Package,
  Receipt,
  Users,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  isActive: (pathname: string) => boolean
}

/** Navegación del participante / coordinador fuera del área admin. */
const participantNavRoutes = [
  {
    label: 'Inicio',
    href: '/app',
    icon: LayoutDashboard,
    isActive: (p: string) => p === '/app',
  },
  {
    label: 'Noticias',
    href: '/app/noticias',
    icon: Newspaper,
    isActive: (p: string) => p.startsWith('/app/noticias'),
  },
  {
    label: 'Materiales',
    href: '/app/stock',
    icon: Package,
    isActive: (p: string) => p.startsWith('/app/stock'),
  },
  {
    label: 'Gastos',
    href: '/app/gastos',
    icon: Receipt,
    isActive: (p: string) => p.startsWith('/app/gastos'),
  },
] as const satisfies NavItem[]

export const participantNavItems: NavItem[] = [...participantNavRoutes]

/** Bottom bar mobile — misma fuente que sidebar desktop. */
export const mobileNavItems: NavItem[] = [...participantNavRoutes]

export const adminNavItems = [
  { label: 'Noticias', href: '/app/admin/noticias', icon: Newspaper },
  { label: 'Jornadas', href: '/app/admin/jornadas', icon: CalendarDays },
  { label: 'Proyectos', href: '/app/admin/proyectos', icon: FolderKanban },
  { label: 'Gastos', href: '/app/admin/gastos', icon: Receipt },
  { label: 'Materiales', href: '/app/admin/stock', icon: Package },
  { label: 'Usuarios', href: '/app/admin/usuarios', icon: Users },
]
