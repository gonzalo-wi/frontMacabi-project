import type { LucideIcon } from 'lucide-react'
import { Bus, Package, Receipt, UtensilsCrossed } from 'lucide-react'

import { AuthBrandMark, AuthDotGridBackground } from '@/layouts/auth/AuthLayoutParts'

const features: { icon: LucideIcon; label: string; desc: string }[] = [
  { icon: Bus, label: 'Micros', desc: 'Reservá tu asiento en cada salida' },
  { icon: UtensilsCrossed, label: 'Comidas', desc: 'Gestioná almuerzos y menúes' },
  { icon: Receipt, label: 'Reembolsos', desc: 'Registrá y controlá tus gastos' },
  { icon: Package, label: 'Materiales', desc: 'Accedé al inventario de materiales' },
]

export function LoginBrandingPanel() {
  return (
    <div className="lg:w-[46%] xl:w-[50%] bg-sidebar flex flex-col relative overflow-hidden">
      <AuthDotGridBackground login />

      <div className="relative z-10 p-6 sm:p-8 lg:p-10 xl:p-12">
        <AuthBrandMark size="sm" />
      </div>

      <div className="lg:hidden relative z-10 flex flex-col items-center text-center px-8 pt-2 pb-16 flex-1">
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/15 shadow-2xl flex items-center justify-center mb-5">
          <img
            src="/logo_macabi.png"
            alt="Macabi"
            className="w-12 h-12 object-contain brightness-0 invert"
          />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-2.5">
          Bienvenido
        </h1>
        <p className="text-sm text-sidebar-muted-foreground leading-relaxed max-w-[260px]">
          La plataforma para madrijim y coordinadores de Macabi Argentina
        </p>

        <div className="flex items-center gap-4 mt-8">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white/65" />
              </div>
              <span className="text-[10px] text-sidebar-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden lg:flex relative z-10 flex-col flex-1 justify-center px-10 xl:px-14 pb-8">
        <div className="mb-10">
          <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-sidebar-foreground leading-[1.08] tracking-tight mb-4">
            Todo lo que
            <br />
            <span className="text-sidebar-primary">necesitás,</span>
            <br />
            en un solo lugar.
          </h1>
          <p className="text-sm text-sidebar-muted-foreground leading-relaxed max-w-[320px]">
            Administrá comidas, reembolsos, materiales y asistencia de jornadas sin complicaciones.
          </p>
        </div>

        <div className="space-y-2">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white/5 border border-white/[0.07] hover:bg-white/8 hover:border-white/15 transition-all duration-200 group cursor-default"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-sidebar-primary/30 transition-colors">
                <Icon className="w-4 h-4 text-white/75" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground leading-none mb-0.5">{label}</p>
                <p className="text-xs text-sidebar-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden lg:block relative z-10 px-10 xl:px-14 pb-8">
        <p className="text-[11px] text-sidebar-muted-foreground/50">
          © {new Date().getFullYear()} Macabi Argentina · Plataforma Madrijim
        </p>
      </div>
    </div>
  )
}
