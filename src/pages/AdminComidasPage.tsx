import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, UtensilsCrossed, Plus, ChefHat, Calendar, X, BookOpen, CheckSquare, Square, Pencil, Trash2, ImagePlus, Sun, Moon } from 'lucide-react'
import { uploadMealImage } from '@/lib/supabase'

import { useAuth } from '@/hooks/useAuth'
import { getAdminDailySummary, getAdminMealsByDate, createMeal, getMealTemplates, createMealTemplate, updateMealTemplate, deleteMealTemplate, deleteMeal } from '@/lib/api/admin'
import type { DailySummaryDTO, MealDTO, MealTemplateDTO, CreateMealTemplateBody, UpdateMealTemplateBody } from '@/lib/api/types'

// ─── Helpers ────────────────────────────────────────────────

function nextSaturdayISO(): string {
  const today = new Date()
  const day = today.getDay()
  const daysUntilSaturday = day === 6 ? 0 : (6 - day)
  const sat = new Date(today)
  sat.setDate(today.getDate() + daysUntilSaturday)
  return sat.toISOString().split('T')[0]
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-')
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const fecha = new Date(Number(y), Number(m) - 1, Number(d))
  return `${dias[fecha.getDay()]} ${Number(d)} de ${meses[Number(m) - 1]} de ${y}`
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const CARD_COLORS = [
  { border: 'border-l-blue-500',    badge: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500',    avatar: 'bg-blue-100 text-blue-700'    },
  { border: 'border-l-emerald-500', badge: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', avatar: 'bg-emerald-100 text-emerald-700' },
  { border: 'border-l-violet-500',  badge: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  bar: 'bg-violet-500',  avatar: 'bg-violet-100 text-violet-700'  },
  { border: 'border-l-amber-500',   badge: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   avatar: 'bg-amber-100 text-amber-700'   },
  { border: 'border-l-rose-500',    badge: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-700',    bar: 'bg-rose-500',    avatar: 'bg-rose-100 text-rose-700'    },
]

const CATEGORIES = [
  { value: 'pastas',             label: 'Pastas' },
  { value: 'milanesas',          label: 'Milanesas' },
  { value: 'ensaladas',          label: 'Ensaladas' },
  { value: 'sandwiches_y_wraps', label: 'Sandwiches y wraps' },
  { value: 'pollo',              label: 'Pollo' },
  { value: 'carne',              label: 'Carne' },
]

// ─── Tab: Preparación del sábado ────────────────────────────

function TabPreparacion({ summary }: { summary: DailySummaryDTO }) {
  return (
    <div className="space-y-6">
      {/* Hero total */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D1B2A] to-[#1a3a5c] p-5 sm:p-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-2 top-12 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1">
              Total de porciones a preparar
            </p>
            <p className="text-5xl sm:text-8xl font-black leading-none tabular-nums">{summary.totalMenus}</p>
            <p className="text-blue-400 text-sm mt-3">para el {formatDateLabel(summary.fecha)}</p>
          </div>
          <div className="hidden sm:flex flex-col items-center gap-1 bg-white/10 rounded-2xl px-8 py-5">
            <ChefHat className="h-10 w-10 text-blue-300" />
            <span className="text-xs text-blue-400 font-medium mt-1">menús</span>
          </div>
        </div>

        {/* Barra de proporción */}
        {summary.porMenu.length > 0 && (
          <>
            <div className="relative mt-6 flex rounded-full overflow-hidden h-2.5 gap-px">
              {summary.porMenu.map((menu, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length]
                const pct = (menu.cantidad / summary.totalMenus) * 100
                return (
                  <div
                    key={menu.menuId}
                    className={`${color.badge} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${menu.nombre}: ${menu.cantidad}`}
                  />
                )
              })}
            </div>
            {/* Leyenda de colores */}
            <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {summary.porMenu.map((menu, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length]
                return (
                  <div key={menu.menuId} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.badge}`} />
                    <span className="text-xs text-blue-200 font-medium">{menu.nombre}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Sin pedidos */}
      {summary.porMenu.length === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <UtensilsCrossed className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay pedidos para esta fecha</p>
          <p className="text-gray-400 text-sm mt-1">Los empleados aún no reservaron su menú</p>
        </div>
      )}

      {/* Cards por menú */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.porMenu.map((menu, i) => {
          const color = CARD_COLORS[i % CARD_COLORS.length]
          const pct = summary.totalMenus > 0
            ? Math.round((menu.cantidad / summary.totalMenus) * 100)
            : 0

          return (
            <div
              key={menu.menuId}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${color.border} overflow-hidden`}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base leading-snug">{menu.nombre}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${color.text}`}>{pct}% del total</p>
                  </div>
                  <div className={`${color.light} ${color.text} rounded-xl px-3 py-1.5 text-center min-w-[56px]`}>
                    <p className="text-3xl font-black leading-none">{menu.cantidad}</p>
                    <p className="text-[10px] font-semibold mt-0.5">
                      {menu.cantidad === 1 ? 'porción' : 'porciones'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className={`px-5 py-3 ${color.light} border-t border-gray-100`}>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                  Quiénes pidieron este menú
                </p>
                <div className="flex flex-wrap gap-2">
                  {menu.personas.map((p, j) => (
                    <div key={j} className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold ${color.avatar} flex-shrink-0`}>
                        {getInitials(p.nombre)}
                      </span>
                      <span className="text-sm text-gray-700 font-medium">{p.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: Gestionar menús ────────────────────────────────────

function TabMenus({ date, meals }: { date: string; meals: MealDTO[] }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateForm, setTemplateForm] = useState<CreateMealTemplateBody>({
    title: '', image_url: '', description: '', category: '', type: 'almuerzo',
  })
  const [editingTemplate, setEditingTemplate] = useState<MealTemplateDTO | null>(null)
  const [editForm, setEditForm] = useState<UpdateMealTemplateBody>({})
  const [uploadingCreate, setUploadingCreate] = useState(false)
  const [uploadingEdit, setUploadingEdit] = useState(false)
  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  const handleCreateImageUpload = async (file: File) => {
    setUploadingCreate(true)
    try {
      const url = await uploadMealImage(file)
      setTemplateForm(prev => ({ ...prev, image_url: url }))
    } catch (e) {
      console.error('Error subiendo imagen:', e)
    } finally {
      setUploadingCreate(false)
    }
  }

  const handleEditImageUpload = async (file: File) => {
    setUploadingEdit(true)
    try {
      const url = await uploadMealImage(file)
      setEditForm(prev => ({ ...prev, image_url: url }))
    } catch (e) {
      console.error('Error subiendo imagen:', e)
    } finally {
      setUploadingEdit(false)
    }
  }

  const templatesQuery = useQuery({
    queryKey: ['meal-templates'],
    queryFn: () => getMealTemplates(token!),
    enabled: !!token,
  })

  const createTemplateMutation = useMutation({
    mutationFn: (body: CreateMealTemplateBody) => createMealTemplate(token!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meal-templates'] })
      setShowTemplateForm(false)
      setTemplateForm({ title: '', image_url: '', description: '', category: '', type: 'almuerzo' })
    },
  })

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMealTemplateBody }) =>
      updateMealTemplate(token!, id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meal-templates'] })
      setEditingTemplate(null)
      setEditForm({})
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteMealTemplate(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meal-templates'] })
    },
  })

  const deleteMealMutation = useMutation({
    mutationFn: (id: string) => deleteMeal(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-meals', date] })
    },
  })

  const startEdit = (tpl: MealTemplateDTO) => {
    setEditingTemplate(tpl)
    setEditForm({ title: tpl.title, description: tpl.description, category: tpl.category, image_url: tpl.image_url, type: tpl.type })
    setShowTemplateForm(false)
  }

  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({})

  const programMutation = useMutation({
    mutationFn: async (entries: { template_id: string; available_count: number }[]) => {
      for (const e of entries) {
        await createMeal(token!, { ...e, date: `${date}T00:00:00Z` })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-meals', date] })
      setSelectedCounts({})
    },
  })

  const toggleTemplate = (id: string) => {
    setSelectedCounts(prev =>
      id in prev
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id))
        : { ...prev, [id]: 1 }
    )
  }

  const setCount = (id: string, val: number) => {
    setSelectedCounts(prev => ({ ...prev, [id]: Math.max(1, val) }))
  }

  const handleProgram = () => {
    const entries = Object.entries(selectedCounts).map(([template_id, available_count]) => ({
      template_id,
      available_count,
    }))
    if (entries.length === 0) return
    programMutation.mutate(entries)
  }

  const templates: MealTemplateDTO[] = templatesQuery.data?.data ?? []
  const selectedIds = Object.keys(selectedCounts)

  const inputClass = 'px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all w-full'

  const TypeToggle = ({
    value,
    onChange,
  }: {
    value: string | undefined
    onChange: (t: 'almuerzo' | 'cena') => void
  }) => (
    <div className="flex gap-2">
      {(['almuerzo', 'cena'] as const).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            value === t
              ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t === 'almuerzo' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {t === 'almuerzo' ? 'Almuerzo' : 'Cena'}
        </button>
      ))}
    </div>
  )

  const ImagePicker = ({
    url,
    onUpload,
    onClear,
    uploading,
    fileRef,
    label,
  }: {
    url: string | undefined
    onUpload: (f: File) => void
    onClear: () => void
    uploading: boolean
    fileRef: React.RefObject<HTMLInputElement | null>
    label: string
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
      />
      {url ? (
        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 group">
          <img src={url} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-1.5 w-full h-28 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors disabled:opacity-60"
        >
          {uploading
            ? <><Loader2 className="h-5 w-5 animate-spin" /><span className="text-xs">Subiendo...</span></>
            : <><ImagePlus className="h-5 w-5" /><span className="text-xs font-medium">Subir imagen</span></>}
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Izquierda: Catálogo de templates ── */}
      <div className="order-2 lg:order-1 flex-1 min-w-0 space-y-4">

        {/* Header del catálogo */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-900" />
              Catálogo de menús
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {templates.length > 0 ? `${templates.length} plato${templates.length > 1 ? 's' : ''} disponible${templates.length > 1 ? 's' : ''}` : 'Catálogo vacío'}
            </p>
          </div>
          <button
            onClick={() => { setShowTemplateForm(v => !v); setEditingTemplate(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
              showTemplateForm
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showTemplateForm
              ? <><X className="h-4 w-4" />Cancelar</>
              : <><Plus className="h-4 w-4" />Nuevo</>}
          </button>
        </div>

        {/* Formulario: crear */}
        {showTemplateForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-800 mb-4">Nuevo template</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Nombre<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="Ej: Milanesa napolitana"
                  value={templateForm.title}
                  onChange={e => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Descripción</label>
                <input
                  className={inputClass}
                  placeholder="Ej: Con papas fritas"
                  value={templateForm.description}
                  onChange={e => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <ImagePicker
                url={templateForm.image_url}
                onUpload={handleCreateImageUpload}
                onClear={() => setTemplateForm(prev => ({ ...prev, image_url: '' }))}
                uploading={uploadingCreate}
                fileRef={createFileRef}
                label="Imagen"
              />
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Categoría<span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={templateForm.category}
                    onChange={e => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Seleccionar categoría</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Tipo<span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <TypeToggle
                    value={templateForm.type}
                    onChange={t => setTemplateForm(prev => ({ ...prev, type: t }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => createTemplateMutation.mutate(templateForm)}
                disabled={createTemplateMutation.isPending || !templateForm.title || !templateForm.category}
                className="px-5 py-2.5 bg-[#0D1B2A] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#1a3a5c] transition-all"
              >
                {createTemplateMutation.isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span>
                  : 'Guardar template'}
              </button>
            </div>
          </div>
        )}

        {/* Formulario: editar */}
        {editingTemplate && (
          <div className="bg-white rounded-2xl border border-amber-200 ring-1 ring-amber-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-800">
                Editando: <span className="text-amber-700">{editingTemplate.title}</span>
              </p>
              <button
                onClick={() => { setEditingTemplate(null); setEditForm({}) }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Nombre</label>
                <input
                  className={inputClass}
                  value={(editForm.title ?? '') as string}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Descripción</label>
                <input
                  className={inputClass}
                  value={(editForm.description ?? '') as string}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <ImagePicker
                url={editForm.image_url}
                onUpload={handleEditImageUpload}
                onClear={() => setEditForm(prev => ({ ...prev, image_url: '' }))}
                uploading={uploadingEdit}
                fileRef={editFileRef}
                label="Imagen"
              />
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">Categoría</label>
                  <select
                    className={inputClass}
                    value={editForm.category ?? ''}
                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Seleccionar categoría</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">Tipo</label>
                  <TypeToggle
                    value={editForm.type}
                    onChange={t => setEditForm(prev => ({ ...prev, type: t }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => updateTemplateMutation.mutate({ id: editingTemplate.id, body: editForm })}
                disabled={updateTemplateMutation.isPending}
                className="px-5 py-2.5 bg-[#0D1B2A] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#1a3a5c] transition-all"
              >
                {updateTemplateMutation.isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span>
                  : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* Grid de template cards */}
        {templatesQuery.isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-28 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded w-4/5" />
                  <div className="h-3 bg-gray-100 rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm">No hay templates creados</p>
            <p className="text-gray-400 text-xs mt-1">Usá el botón "Nuevo" para crear el catálogo</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl, i) => {
              const color = CARD_COLORS[i % CARD_COLORS.length]
              const isEditing = editingTemplate?.id === tpl.id
              return (
                <div
                  key={tpl.id}
                  className={`group relative bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-200 ${
                    isEditing
                      ? 'border-amber-300 ring-2 ring-amber-100'
                      : 'border-gray-100 hover:shadow-md hover:border-gray-200'
                  }`}
                >
                  {/* Imagen con acciones en hover */}
                  <div className="relative h-28 overflow-hidden bg-gray-50">
                    {tpl.image_url
                      ? <img src={tpl.image_url} alt={tpl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="h-8 w-8 text-gray-200" />
                        </div>
                    }
                    {/* Overlay de acciones */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(tpl)}
                        title="Editar"
                        className="p-2 bg-white rounded-full text-blue-700 hover:bg-blue-50 shadow-md transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTemplateMutation.mutate(tpl.id)}
                        disabled={deleteTemplateMutation.isPending}
                        title="Eliminar"
                        className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 shadow-md transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Badge tipo sobre imagen */}
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.light} ${color.text} shadow-sm`}>
                        {tpl.type === 'almuerzo' ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                        {tpl.type === 'almuerzo' ? 'Almuerzo' : 'Cena'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{tpl.title}</p>
                    {tpl.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tpl.description}</p>
                    )}
                    {tpl.category && (
                      <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${color.light} ${color.text}`}>
                        {tpl.category.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Derecha: Panel "Programar sábado" ── */}
      <div className="order-1 lg:order-2 w-full lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:sticky lg:top-6">

          {/* Header del panel */}
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-900" />
              Programar el sábado
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateLabel(date)}</p>
          </div>

          {/* Lista de selección */}
          {templatesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 px-4">
              Creá templates en el catálogo para poder programarlos
            </p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {templates.map((tpl, i) => {
                const selected = tpl.id in selectedCounts
                const color = CARD_COLORS[i % CARD_COLORS.length]
                return (
                  <div
                    key={tpl.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                      selected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleTemplate(tpl.id)}
                  >
                    <div className="flex-shrink-0">
                      {selected
                        ? <CheckSquare className="h-4 w-4 text-blue-900" />
                        : <Square className="h-4 w-4 text-gray-300" />}
                    </div>
                    <div className={`h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 ${color.light}`}>
                      {tpl.image_url
                        ? <img src={tpl.image_url} alt={tpl.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed className={`h-3.5 w-3.5 ${color.text}`} />
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate leading-snug">{tpl.title}</p>
                      <p className={`text-[10px] font-semibold ${color.text}`}>
                        {tpl.type === 'almuerzo' ? 'Almuerzo' : 'Cena'}
                      </p>
                    </div>
                    {selected && (
                      <input
                        type="number"
                        min={1}
                        value={selectedCounts[tpl.id]}
                        onChange={e => setCount(tpl.id, Number(e.target.value))}
                        onClick={e => e.stopPropagation()}
                        className="w-14 px-1.5 py-1 border border-blue-200 rounded-lg text-xs text-center font-bold outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Ya programado */}
          {meals.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">
                Ya programado
              </p>
              <div className="space-y-2">
                {meals.map((meal, i) => {
                  const color = CARD_COLORS[i % CARD_COLORS.length]
                  return (
                    <div key={meal.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.badge}`} />
                      <span className="text-xs text-gray-700 font-medium flex-1 truncate">{meal.title}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">×{meal.available_count}</span>
                      <button
                        onClick={() => deleteMealMutation.mutate(meal.id)}
                        disabled={deleteMealMutation.isPending}
                        title="Eliminar"
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Botón guardar */}
          <div className="px-5 py-4 border-t border-gray-100">
            {selectedIds.length > 0 ? (
              <button
                onClick={handleProgram}
                disabled={programMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0D1B2A] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3a5c] disabled:opacity-60 transition-all"
              >
                {programMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                  : <><Plus className="h-4 w-4" />Guardar {selectedIds.length} menú{selectedIds.length > 1 ? 's' : ''}</>}
              </button>
            ) : (
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Seleccioná menús del catálogo para programarlos para este sábado
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────

type Tab = 'preparacion' | 'menus'

const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'preparacion', label: 'Preparación del sábado', shortLabel: 'Preparación', icon: ChefHat },
  { id: 'menus',       label: 'Gestionar menús',        shortLabel: 'Menús',        icon: UtensilsCrossed },
]

export default function AdminComidasPage() {
  const { token } = useAuth()
  const [date, setDate] = useState(nextSaturdayISO)
  const [activeTab, setActiveTab] = useState<Tab>('preparacion')

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-blue-900" />
                Preparación de comidas
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{formatDateLabel(date)}</p>
            </div>
            <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer hover:border-blue-300 transition-all">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                className="text-sm bg-transparent outline-none text-gray-700 cursor-pointer"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-5 -mb-[1px]">
            {TABS.map(t => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                    active
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-900" />
            <p className="text-sm font-medium">Cargando datos...</p>
          </div>
        ) : (
          <>
            {activeTab === 'preparacion' && summaryQuery.data && (
              <TabPreparacion summary={summaryQuery.data} />
            )}
            {activeTab === 'preparacion' && !summaryQuery.data && !summaryQuery.isLoading && (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
                <UtensilsCrossed className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sin datos para esta fecha</p>
              </div>
            )}
            {activeTab === 'menus' && (
              <TabMenus date={date} meals={mealsQuery.data?.data ?? []} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
