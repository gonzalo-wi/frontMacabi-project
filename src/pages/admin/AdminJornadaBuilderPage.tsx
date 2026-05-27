import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarRange, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createEventModule,
  createOption,
  createOptionGroup,
  deleteEventModule,
  getEventDetail,
  patchEventInstance,
  setEventInstanceProjects,
} from '@/features/events/api/eventsApi'
import { EventModuleEditorCard } from '@/features/events/components/EventModuleEditor'
import { moduleEditorResetKey } from '@/features/events/lib/moduleEditorKey'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import { labelInstanceStatus, labelInstanceType } from '@/features/events/lib/eventLabels'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import { ProjectPicker } from '@/features/projects/components/ProjectPicker'
import { listProjects } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

function projectSetsEqual(sel: Set<string>, ids: string[] | undefined) {
  const a = [...sel].sort().join('\0')
  const b = [...(ids ?? [])].sort().join('\0')
  return a === b
}

export default function AdminJornadaBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()

  const detailQ = useQuery({
    queryKey: ['event-detail', id, token],
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getEventDetail(token!, id!),
  })

  const projectsQ = useQuery({
    queryKey: ['projects-all-p1', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: async () => {
      const out: ProjectDTO[] = []
      let page = 1
      while (page <= 20) {
        const r = await listProjects(token!, page, 50)
        out.push(...r.data)
        if (page >= r.total_pages) break
        page++
      }
      return out
    },
  })

  // ── Form state ─────────────────────────────────────────────────────────────
  const [metaTitle, setMetaTitle] = useState('')
  const [metaType, setMetaType] = useState('activity')
  const [startsLocal, setStartsLocal] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [metaStatus, setMetaStatus] = useState('draft')
  const [evProjects, setEvProjects] = useState<Set<string>>(new Set())

  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const [builderSection, setBuilderSection] = useState('general')
  const [globalSaving, setGlobalSaving] = useState(false)

  // ── Module saver registry ──────────────────────────────────────────────────
  // Each EventModuleEditorCard registers its async save function here.
  const moduleSavers = useRef<Set<() => Promise<void>>>(new Set())
  const [moduleDirtyCount, setModuleDirtyCount] = useState(0)

  const registerModuleSaver = useCallback((fn: () => Promise<void>) => {
    moduleSavers.current.add(fn)
    return () => {
      moduleSavers.current.delete(fn)
    }
  }, [])

  const handleModuleDirtyChange = useCallback(
    (dirty: boolean) => {
      setModuleDirtyCount((prev) => (dirty ? prev + 1 : Math.max(0, prev - 1)))
    },
    [],
  )

  // ── Sync from server ───────────────────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const d = detailQ.data
    if (!d) return
    setMetaTitle(d.instance.title)
    setMetaType(d.instance.type)
    setStartsLocal(toDatetimeLocalValue(d.instance.starts_at))
    setDeadlineLocal(
      d.instance.response_deadline_at
        ? toDatetimeLocalValue(d.instance.response_deadline_at)
        : '',
    )
    setMetaStatus(d.instance.status)
    setEvProjects(new Set(d.project_ids))
  }, [detailQ.data])
  /* eslint-enable react-hooks/set-state-in-effect */

  const invalidateDetail = useCallback(
    () => void qc.invalidateQueries({ queryKey: ['event-detail', id, token] }),
    [qc, id, token],
  )

  // ── Dirty detection ────────────────────────────────────────────────────────
  const inst = detailQ.data?.instance

  const metaDirty = useMemo(() => {
    if (!detailQ.data) return false
    const d = detailQ.data
    const titleEq = metaTitle.trim() === d.instance.title.trim()
    const typeEq = metaType === d.instance.type
    const startsEq =
      Boolean(startsLocal) &&
      new Date(fromDatetimeLocalValue(startsLocal)).getTime() ===
        new Date(d.instance.starts_at).getTime()
    const deadlineSaved = d.instance.response_deadline_at
      ? toDatetimeLocalValue(d.instance.response_deadline_at)
      : ''
    const deadlineEq =
      (deadlineLocal === '' && !d.instance.response_deadline_at) ||
      (deadlineLocal !== '' && deadlineSaved === deadlineLocal)
    const statusEq = metaStatus === d.instance.status
    return !(titleEq && typeEq && startsEq && deadlineEq && statusEq)
  }, [deadlineLocal, detailQ.data, metaStatus, metaTitle, metaType, startsLocal])

  const projectsDirty = useMemo(() => {
    if (!detailQ.data) return false
    return !projectSetsEqual(evProjects, detailQ.data.project_ids)
  }, [detailQ.data, evProjects])

  const anythingDirty = metaDirty || projectsDirty || moduleDirtyCount > 0

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMeta = useMutation({
    mutationFn: async () => {
      if (!id || !startsLocal) throw new Error('Completá fecha de inicio')
      await patchEventInstance(token!, id, {
        title: metaTitle,
        type: metaType,
        starts_at: fromDatetimeLocalValue(startsLocal),
        response_deadline_at: deadlineLocal ? fromDatetimeLocalValue(deadlineLocal) : null,
        status: metaStatus,
      })
    },
    onSuccess: invalidateDetail,
  })

  const saveEventProjects = useMutation({
    mutationFn: async () => {
      if (!id) return
      await setEventInstanceProjects(token!, id, { project_ids: [...evProjects] })
    },
    onSuccess: invalidateDetail,
  })

  const addModule = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID')
      const sort =
        (detailQ.data?.modules.reduce((m, x) => Math.max(m, x.module.sort_order), -1) ?? -1) + 1
      await createEventModule(token!, {
        event_instance_id: id,
        title: 'Nuevo módulo',
        type: 'custom',
        sort_order: sort,
        is_required: false,
      })
    },
    onSuccess: invalidateDetail,
  })

  const delModule = useMutation({
    mutationFn: async (mid: string) => deleteEventModule(token!, mid),
    onSuccess: invalidateDetail,
  })

  const addGroup = useMutation({
    mutationFn: async (moduleId: string) => {
      const md = detailQ.data?.modules.find((m) => m.module.id === moduleId)
      const sort =
        (md?.option_groups.reduce((m, x) => Math.max(m, x.group.sort_order), -1) ?? -1) + 1
      await createOptionGroup(token!, {
        module_id: moduleId,
        name: 'Nuevo grupo',
        type: 'single_choice',
        sort_order: sort,
        is_required: false,
      })
    },
    onSuccess: invalidateDetail,
  })

  const addOption = useMutation({
    mutationFn: async (groupId: string) => {
      const gd = detailQ.data?.modules
        .flatMap((m) => m.option_groups)
        .find((g) => g.group.id === groupId)
      const sort = (gd?.options.reduce((m, x) => Math.max(m, x.sort_order), -1) ?? -1) + 1
      await createOption(token!, {
        group_id: groupId,
        label: 'Opción',
        max_capacity: null,
        sort_order: sort,
      })
    },
    onSuccess: invalidateDetail,
  })

  // ── Global save ────────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    setGlobalSaving(true)
    setFeedback(null)
    try {
      const calls: Promise<unknown>[] = []
      if (metaDirty) calls.push(saveMeta.mutateAsync())
      if (projectsDirty) calls.push(saveEventProjects.mutateAsync())
      for (const saver of moduleSavers.current) calls.push(saver())
      await Promise.all(calls)
      setFeedback({ text: 'Cambios guardados correctamente.', variant: 'success' })
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al guardar',
        variant: 'error',
      })
    } finally {
      setGlobalSaving(false)
    }
  }

  // ── Misc ───────────────────────────────────────────────────────────────────
  const sortedModules = useMemo(() => {
    const m = detailQ.data?.modules ?? []
    return [...m].sort((a, b) => a.module.sort_order - b.module.sort_order)
  }, [detailQ.data])

  if (!id) return null

  const headerTitle = inst?.title ?? 'Jornada'
  const headerSubtitle =
    inst != null
      ? `Editor del formulario · ${labelInstanceStatus(inst.status)}`
      : 'Edición por sección'

  const scrollToModule = (moduleId: string) => {
    setBuilderSection('form')
    queueMicrotask(() =>
      document
        .getElementById(`module-${moduleId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  return (
    <div className="min-h-screen pb-32">
      <PageHeader
        icon={CalendarRange}
        title={headerTitle}
        subtitle={headerSubtitle}
        action={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <ActionButton intent="view" asChild>
              <Link to={`/app/admin/jornadas/${id}`}>Ficha</Link>
            </ActionButton>
            <ActionButton intent="back" asChild>
              <Link to="/app/admin/jornadas">Listado</Link>
            </ActionButton>
            {inst && (
              <ActionButton
                intent="primary"
                disabled={globalSaving || !anythingDirty}
                onClick={handleSaveAll}
              >
                {globalSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </ActionButton>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        {detailQ.isError && (
          <p className="text-sm text-destructive">
            {detailQ.error instanceof ApiError
              ? detailQ.error.message
              : 'Error al cargar la jornada'}
          </p>
        )}

        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        {detailQ.isLoading && (
          <div className="space-y-4">
            <div className="h-10 w-72 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-32 bg-muted/50 rounded-xl animate-pulse opacity-70" />
          </div>
        )}

        {detailQ.data && (
          <Tabs value={builderSection} onValueChange={setBuilderSection} className="gap-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
              <TabsTrigger value="general" className="gap-1.5">
                Datos generales
                {metaDirty && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden title="Sin guardar" />
                )}
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5">
                Proyectos
                {projectsDirty && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden title="Sin guardar" />
                )}
              </TabsTrigger>
              <TabsTrigger value="form" className="gap-1.5">
                Formulario · módulos
                {moduleDirtyCount > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden title="Sin guardar" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Datos generales ── */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Estado actual
                </span>
                <EventStatusBadge status={detailQ.data.instance.status} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos generales</CardTitle>
                  <CardDescription>Título, tipo, fechas y estado de publicación.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-title">Título</Label>
                    <Input
                      id="meta-title"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tipo de jornada</Label>
                      <Select value={metaType} onValueChange={setMetaType}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activity">{labelInstanceType('activity')}</SelectItem>
                          <SelectItem value="custom">{labelInstanceType('custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Select value={metaStatus} onValueChange={setMetaStatus}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{labelInstanceStatus('draft')}</SelectItem>
                          <SelectItem value="open">{labelInstanceStatus('open')}</SelectItem>
                          <SelectItem value="closed">{labelInstanceStatus('closed')}</SelectItem>
                          <SelectItem value="cancelled">
                            {labelInstanceStatus('cancelled')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Inicio</Label>
                      <Input
                        type="datetime-local"
                        value={startsLocal}
                        onChange={(e) => setStartsLocal(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Límite respuestas</Label>
                      <Input
                        type="datetime-local"
                        value={deadlineLocal}
                        onChange={(e) => setDeadlineLocal(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Proyectos ── */}
            <TabsContent value="projects" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Proyectos participantes</CardTitle>
                  <CardDescription>
                    Define qué proyectos pueden ver esta jornada en listados y al responder. En la
                    pestaña <strong>Formulario</strong>, cada módulo puede restringirse aún más.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectPicker
                    projects={projectsQ.data ?? []}
                    selected={evProjects}
                    onChange={setEvProjects}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Formulario ── */}
            <TabsContent value="form" className="space-y-6 mt-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Módulos de la respuesta</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Agregar módulos, grupos y opciones es inmediato. Editá el contenido y usá
                    <strong> Guardar cambios</strong> para confirmar las ediciones.
                  </p>
                </div>
                <ActionButton intent="primary" onClick={() => addModule.mutate()} disabled={addModule.isPending}>
                  {addModule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Módulo'}
                </ActionButton>
              </div>

              {sortedModules.length > 1 && (
                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Índice</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="flex flex-wrap gap-2">
                      {sortedModules.map((md, i) => (
                        <li key={md.module.id}>
                          <ActionButton
                            type="button"
                            intent="secondary"
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={() => scrollToModule(md.module.id)}
                          >
                            {i + 1}. {md.module.title}
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {sortedModules.map((md, i) => (
                  <EventModuleEditorCard
                    key={moduleEditorResetKey(md)}
                    md={md}
                    projects={projectsQ.data ?? []}
                    token={token!}
                    anchorId={`module-${md.module.id}`}
                    defaultOpen={i === 0}
                    onDeleteModule={() => delModule.mutate(md.module.id)}
                    onAddGroup={() => addGroup.mutate(md.module.id)}
                    onAddOption={(groupId) => addOption.mutate(groupId)}
                    onSaved={invalidateDetail}
                    onRegisterSaver={registerModuleSaver}
                    onDirtyChange={handleModuleDirtyChange}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
