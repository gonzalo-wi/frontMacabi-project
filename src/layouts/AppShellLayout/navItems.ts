import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
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
export const participantNavItems: NavItem[] = [
  { label: 'Panel', href: '/app', icon: LayoutDashboard, isActive: (p) => p === '/app' },
  { label: 'Materiales', href: '/app/stock', icon: Package, isActive: (p) => p.startsWith('/app/stock') },
  { label: 'Gastos', href: '/app/gastos', icon: Receipt, isActive: (p) => p.startsWith('/app/gastos') },
]

export const adminNavItems = [
  { label: 'Jornadas', href: '/app/admin/jornadas', icon: CalendarDays },
  { label: 'Proyectos', href: '/app/admin/proyectos', icon: FolderKanban },
  { label: 'Gastos', href: '/app/admin/gastos', icon: Receipt },
  { label: 'Materiales', href: '/app/admin/stock', icon: Package },
  { label: 'Usuarios', href: '/app/admin/usuarios', icon: Users },
]

export const mobileNavItems: NavItem[] = [
  { label: 'Inicio', href: '/app', icon: LayoutDashboard, isActive: (p) => p === '/app' },
  { label: 'Materiales', href: '/app/stock', icon: Package, isActive: (p) => p.startsWith('/app/stock') },
  { label: 'Gastos', href: '/app/gastos', icon: Receipt, isActive: (p) => p.startsWith('/app/gastos') },
]
