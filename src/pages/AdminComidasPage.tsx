import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, UtensilsCrossed, Plus, Search } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { getAdminDailySummary, getAdminMealsByDate, createMeal } from '@/lib/api/admin'
import type { DailySummaryDTO, MealDTO, CreateMealBody } from '@/lib/api/types'
import { PageHeader } from '@/components/PageHeader'

// ─── Helpers ────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-')
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const fecha = new Date(Number(y), Number(m) - 1, Number(d))
  return `${dias[fecha.getDay()]} ${Number(d)} de ${meses[Number(m) - 1]} de ${y}`
}

const TOTAL_EMPLEADOS = 48 // TODO: reemplazar con GET /api/users cuando esté disponible

// ─── Sub-componentes ─────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  color?: string
  sub?: string
}

function StatCard({ label, value, color, sub }: StatCardProps) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color: color ?? '#0D1B2A' }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

interface PillProps {
  children: React.ReactNode
  variant: 'confirmó' | 'no almuerza' | 'sin respuesta'
}

function Pill({ children, variant }: PillProps) {
  const classes: Record<PillProps['variant'], string> = {
    'confirmó':      'bg-green-100 text-green-800',
    'no almuerza':   'bg-red-100 text-red-800',
    'sin respuesta': 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes[variant]}`}>
      {children}
    </span>
  )
}

// ─── Tab: Resumen del día ────────────────────────────────────

interface TabResumenProps {
  summary: DailySummaryDTO
}

function TabResumen({ summary }: TabResumenProps) {
  const [search, setSearch] = useState('')

  const confirmaron = summary.totalMenus
  const sinRespuesta = Math.max(0, TOTAL_EMPLEADOS - confirmaron)
  const noAlmuerzan = 0 // el back no lo devuelve aún

  const filas = summary.porMenu.flatMap(menu =>
    menu.personas.map(p => ({
      nombre: p.nombre,
      menu: menu.nombre,
    }))
  )

  const filtradas = search
    ? filas.filter(f => f.nombre.toLowerCase().includes(search.toLowerCase()))
    : filas

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total empleados" value={TOTAL_EMPLEADOS} sub="activos" />
        <StatCard
          label="Confirmaron almuerzo"
          value={confirmaron}
          color="#3B6D11"
          sub={`${Math.round((confirmaron / TOTAL_EMPLEADOS) * 100)}% del total`}
        />
        <StatCard
          label="No almuerzan"
          value={noAlmuerzan}
          color="#A32D2D"
        />
        <StatCard
          label="Sin respuesta"
          value={sinRespuesta}
          color="#854F0B"
          sub={`${Math.round((sinRespuesta / TOTAL_EMPLEADOS) * 100)}% del total`}
        />
      </div>

      {/* Cards por menú */}
      <div className="grid grid-cols-2 gap-3">
        {summary.porMenu.map(menu => (
          <div key={menu.menuId} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-sm text-gray-900">{menu.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{menu.cantidad} pedidos</p>
              </div>
              <span className="bg-blue-50 text-blue-900 font-bold text-lg px-3 py-1 rounded-lg">
                {menu.cantidad}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-blue-900 rounded-full transition-all"
                style={{ width: `${Math.min(100, (menu.cantidad / confirmaron) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((menu.cantidad / confirmaron) * 100)}% de los confirmados
            </p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-blue-900">
          <p className="font-semibold text-sm">Detalle por empleado</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 w-48 outline-none"
              placeholder="Buscar empleado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-blue-900 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-2.5 text-left">Empleado</th>
              <th className="px-5 py-2.5 text-left">Menú elegido</th>
              <th className="px-5 py-2.5 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-xs text-muted-foreground italic">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtradas.map((f, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">{f.nombre}</td>
                  <td className="px-5 py-3">{f.menu}</td>
                  <td className="px-5 py-3"><Pill variant="confirmó">Confirmó</Pill></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Menús del día ──────────────────────────────────────

interface TabMenusProps {
  date: string
  meals: MealDTO[]
}

function TabMenus({ date, meals }: TabMenusProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<CreateMealBody, 'type' | 'date' | 'image_url'>>({
    title: '',
    description: '',
    category: '',
    available_count: 0,
  })

  const mutation = useMutation({
    mutationFn: (body: CreateMealBody) => createMeal(token!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-meals', date] })
      setShowForm(false)
      setForm({ title: '', description: '', category: '', available_count: 0 })
    },
  })

  const handleSubmit = () => {
    if (!form.title || !form.available_count) return
    mutation.mutate({
      ...form,
      type: 'almuerzo',
      date: `${date}T00:00:00Z`,
      image_url: 'https://example.com/img.jpg',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancelar' : 'Agregar menú'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="font-semibold text-sm mb-4">Nuevo menú para {formatDateLabel(date)}</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'title', label: 'Nombre del menú *', placeholder: 'Ej: Milanesa napolitana' },
              { name: 'category', label: 'Categoría', placeholder: 'Ej: milanesas, aves' },
              { name: 'description', label: 'Descripción', placeholder: 'Ej: Con papas fritas' },
              { name: 'available_count', label: 'Cantidad disponible *', placeholder: 'Ej: 20', type: 'number' },
            ].map(field => (
              <div key={field.name} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">{field.label}</label>
                <input
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  value={form[field.name as keyof typeof form]}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                  }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar menú'}
            </button>
          </div>
        </div>
      )}

      {meals.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-xs text-muted-foreground">
          No hay menús cargados para esta fecha.
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => (
            <div key={meal.id} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-gray-900">{meal.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{meal.description}</p>
                <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-900 px-2 py-0.5 rounded-full font-medium">
                  {meal.category}
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">{meal.available_count}</p>
                <p className="text-xs text-muted-foreground">disponibles</p>
                {meal.sold_out && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                    Agotado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Informe ────────────────────────────────────────────

function TabInforme() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b-2 border-blue-900">
        <p className="font-semibold text-sm">Generar informe por período</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-4 items-end flex-wrap">
          {[
            { label: 'Desde', value: desde, set: setDesde },
            { label: 'Hasta', value: hasta, set: setHasta },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">{label}</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                value={value}
                onChange={e => set(e.target.value)}
              />
            </div>
          ))}
          <button className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg">
            Generar informe
          </button>
          <button className="px-4 py-2 border border-blue-200 text-blue-900 text-sm font-medium rounded-lg">
            Exportar CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────

type Tab = 'resumen' | 'menus' | 'informe'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen del día' },
  { id: 'menus',   label: 'Menús del día' },
  { id: 'informe', label: 'Informe' },
]

export default function AdminComidasPage() {
  const { token } = useAuth()
  const [date, setDate] = useState(todayISO)
  const [activeTab, setActiveTab] = useState<Tab>('resumen')

  const summaryQuery = useQuery({
    queryKey: ['admin-daily-summary', date],
    queryFn: () => getAdminDailySummary(token!, date),
    enabled: !!token,
  })

  const mealsQuery = useQuery({
    queryKey: ['admin-meals', date],
    queryFn: () => getAdminMealsByDate(token!, date),
    enabled: !!token,
  })

  const isLoading = summaryQuery.isLoading || mealsQuery.isLoading

  return (
    <div className="p-7 min-h-screen bg-gray-50 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader
            title="Gestión de comidas"
            subtitle={formatDateLabel(date)}
            icon={UtensilsCrossed}
            />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Fecha</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white text-blue-900 font-semibold shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Cargando...</p>
        </div>
      ) : (
        <>
          {activeTab === 'resumen' && summaryQuery.data && (
            <TabResumen summary={summaryQuery.data} />
          )}
          {activeTab === 'menus' && (
            <TabMenus date={date} meals={mealsQuery.data?.data ?? []} />
          )}
          {activeTab === 'informe' && <TabInforme />}
        </>
      )}
    </div>
  )
}
