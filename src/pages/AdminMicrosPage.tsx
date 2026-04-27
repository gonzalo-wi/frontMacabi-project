import { useState } from 'react'
import { Bus } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'

// ─── Types locales (hasta que el back tenga endpoints de micros) ──

interface Pasajero {
  nombre: string
  tramo: 'ida y vuelta' | 'solo ida' | 'solo vuelta'
}

interface Micro {
  id: string
  nombre: string
  destino: string
  horario: string
  capacidad: number
  pasajeros: Pasajero[]
}

// ─── Mock data ───────────────────────────────────────────────

const MOCK_MICROS: Micro[] = [
  {
    id: 'micro-1',
    nombre: 'Micro 1',
    destino: 'Campo Macabi · Ezeiza',
    horario: '08:30 – 18:00',
    capacidad: 45,
    pasajeros: [
      { nombre: 'González, Laura',    tramo: 'ida y vuelta' },
      { nombre: 'Martínez, Diego',    tramo: 'solo ida' },
      { nombre: 'Romero, Valeria',    tramo: 'ida y vuelta' },
      { nombre: 'Pérez, Tomás',       tramo: 'solo vuelta' },
      { nombre: 'Sánchez, Ana',       tramo: 'ida y vuelta' },
      { nombre: 'López, Martín',      tramo: 'solo ida' },
      { nombre: 'García, Sofía',      tramo: 'ida y vuelta' },
      { nombre: 'Fernández, Pablo',   tramo: 'solo vuelta' },
      { nombre: 'Rodríguez, Julia',   tramo: 'ida y vuelta' },
      { nombre: 'Gómez, Federico',    tramo: 'ida y vuelta' },
      { nombre: 'Torres, Daniela',    tramo: 'solo ida' },
      { nombre: 'Herrera, Lucas',     tramo: 'ida y vuelta' },
    ],
  },
  {
    id: 'micro-2',
    nombre: 'Micro 2',
    destino: 'Campo Macabi · Ezeiza',
    horario: '08:30 – 18:00',
    capacidad: 45,
    pasajeros: [
      { nombre: 'Alvarez, Florencia', tramo: 'ida y vuelta' },
      { nombre: 'Benítez, Rodrigo',  tramo: 'solo ida' },
      { nombre: 'Cabrera, María',     tramo: 'ida y vuelta' },
      { nombre: 'Delgado, Ignacio',   tramo: 'solo vuelta' },
      { nombre: 'Escobar, Valentina', tramo: 'ida y vuelta' },
      { nombre: 'Figueroa, Diego',    tramo: 'ida y vuelta' },
      { nombre: 'Giménez, Agustina',  tramo: 'solo ida' },
      { nombre: 'Ibáñez, Mateo',      tramo: 'ida y vuelta' },
    ],
  },
]

const TOTAL_EMPLEADOS = 48

// ─── Helpers ─────────────────────────────────────────────────

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

function contarTramo(pasajeros: Pasajero[], tramo: Pasajero['tramo']): number {
  return pasajeros.filter(p => p.tramo === tramo).length
}

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

function TramoPill({ tramo }: { tramo: Pasajero['tramo'] }) {
  const classes: Record<Pasajero['tramo'], string> = {
    'ida y vuelta': 'bg-blue-900 text-white',
    'solo ida':     'bg-blue-50 text-blue-900',
    'solo vuelta':  'bg-purple-50 text-purple-800',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes[tramo]}`}>
      {tramo}
    </span>
  )
}

type Tab = 'resumen' | 'carga' | 'informe'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen del día' },
  { id: 'carga',   label: 'Carga manual' },
  { id: 'informe', label: 'Informe' },
]

// ─── Tab: Resumen ────────────────────────────────────────────

function TabResumen({ micros }: { micros: Micro[] }) {
  const totalPasajeros = micros.reduce((a, m) => a + m.pasajeros.length, 0)
  const totalIda    = micros.reduce((a, m) => a + contarTramo(m.pasajeros, 'solo ida') + contarTramo(m.pasajeros, 'ida y vuelta'), 0)
  const totalVuelta = micros.reduce((a, m) => a + contarTramo(m.pasajeros, 'solo vuelta') + contarTramo(m.pasajeros, 'ida y vuelta'), 0)
  const sinMicro    = TOTAL_EMPLEADOS - totalPasajeros

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total con micro" value={totalPasajeros} color="#0D2D6B" sub="empleados" />
        <StatCard label="Viajan ida"      value={totalIda}       color="#0D2D6B" sub="empleados" />
        <StatCard label="Viajan vuelta"   value={totalVuelta}    color="#534AB7" sub="empleados" />
        <StatCard label="Sin micro"       value={sinMicro}       color="#A32D2D" sub="empleados" />
      </div>

      {micros.map(micro => {
        const ida    = contarTramo(micro.pasajeros, 'solo ida') + contarTramo(micro.pasajeros, 'ida y vuelta')
        const vuelta = contarTramo(micro.pasajeros, 'solo vuelta') + contarTramo(micro.pasajeros, 'ida y vuelta')
        const ambos  = contarTramo(micro.pasajeros, 'ida y vuelta')
        const ocupados = micro.pasajeros.length
        const libres   = micro.capacidad - ocupados
        const pct      = Math.round((ocupados / micro.capacidad) * 100)

        return (
          <div key={micro.id} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bus className="h-5 w-5 text-blue-900" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base text-gray-900">{micro.nombre}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${libres > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {libres > 0 ? `${libres} libres` : 'Completo'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {micro.destino} · 🕐 {micro.horario}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-blue-900">
                  {ocupados}<span className="text-sm font-normal text-muted-foreground">/{micro.capacidad}</span>
                </p>
                <p className="text-xs text-muted-foreground">ocupados</p>
              </div>
            </div>

            {/* Barra */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>

            {/* Mini stats */}
            <div className="flex gap-5 text-xs text-muted-foreground">
              <span>🔵 Ida: <strong>{ida}</strong></span>
              <span>🟣 Vuelta: <strong>{vuelta}</strong></span>
              <span>🟦 Ida y vuelta: <strong>{ambos}</strong></span>
            </div>

            {/* Tabla */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-blue-900 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Empleado</th>
                    <th className="px-4 py-2.5 text-left">Tramo</th>
                  </tr>
                </thead>
                <tbody>
                  {micro.pasajeros.map((p, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">{p.nombre}</td>
                      <td className="px-4 py-3"><TramoPill tramo={p.tramo} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Carga manual ───────────────────────────────────────

function TabCarga({ micros }: { micros: Micro[] }) {
  const [form, setForm] = useState({ empleado: '', micro: '', tramo: 'ida y vuelta' as Pasajero['tramo'], observaciones: '' })
  const [guardado, setGuardado] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = () => {
    if (!form.empleado || !form.micro) return
    // TODO: POST al endpoint de micros cuando esté disponible
    setGuardado(true)
    setForm({ empleado: '', micro: '', tramo: 'ida y vuelta', observaciones: '' })
    setTimeout(() => setGuardado(false), 3000)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 max-w-lg space-y-4">
      <p className="font-semibold text-sm">Registrar micro manualmente</p>

      {guardado && (
        <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-2.5 text-sm font-medium">
          ✓ Registro guardado correctamente
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Empleado *</label>
          <input
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            name="empleado"
            value={form.empleado}
            onChange={handleChange}
            placeholder="Nombre del empleado"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Micro *</label>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
            name="micro"
            value={form.micro}
            onChange={handleChange}
          >
            <option value="">Seleccionar micro...</option>
            {micros.map(m => (
              <option key={m.id} value={m.id}>{m.nombre} · {m.destino}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Tramo</label>
          <div className="flex gap-5 mt-1">
            {(['ida y vuelta', 'solo ida', 'solo vuelta'] as Pasajero['tramo'][]).map(t => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="tramo" value={t} checked={form.tramo === t} onChange={handleChange} />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Observaciones</label>
          <textarea
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none"
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            placeholder="Opcional..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg"
        >
          Registrar
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Informe ────────────────────────────────────────────

function TabInforme() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center px-5 py-3 border-b-2 border-blue-900">
        <p className="font-semibold text-sm">Generar informe por período</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-4 items-end flex-wrap">
          {[{ label: 'Desde', value: desde, set: setDesde }, { label: 'Hasta', value: hasta, set: setHasta }].map(({ label, value, set }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">{label}</label>
              <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={value} onChange={e => set(e.target.value)} />
            </div>
          ))}
          <button className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg">Generar informe</button>
          <button className="px-4 py-2 border border-blue-200 text-blue-900 text-sm font-medium rounded-lg">Exportar CSV</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────

export default function AdminMicrosPage() {
  const [date, setDate] = useState(todayISO)
  const [activeTab, setActiveTab] = useState<Tab>('resumen')

  return (
    <div className="p-7 min-h-screen bg-gray-50 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader
            title="Gestión de micros"
            subtitle={formatDateLabel(date)}
            icon={Bus}
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

      {activeTab === 'resumen' && <TabResumen micros={MOCK_MICROS} />}
      {activeTab === 'carga'   && <TabCarga micros={MOCK_MICROS} />}
      {activeTab === 'informe' && <TabInforme />}
    </div>
  )
}
