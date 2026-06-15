import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createEventModule,
  createOption,
  createOptionGroup,
  deleteEventModule,
  getEventDetail,
  patchEventInstance,
  setEventInstanceProjects,
} from '@/features/events/api/eventsApi'
import { labelInstanceStatus } from '@/features/events/lib/eventLabels'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import { fetchAllProjects } from '@/features/projects/api/projectsApi'
import { queryKeys } from '@/lib/queryKeys'

function projectSetsEqual(sel: Set<string>, ids: string[] | undefined) {
  const a = [...sel].sort().join('\0')
  const b = [...(ids ?? [])].sort().join('\0')
  return a === b
}

type Args = {
  id: string | undefined
  token: string | null
  isRestoring: boolean
}

export function useJornadaBuilder({ id, token, isRestoring }: Args) {
  const qc = useQueryClient()

  const detailQ = useQuery({
    queryKey: queryKeys.events.detail(id, token),
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getEventDetail(token!, id!),
  })

  const projectsQ = useQuery({
    queryKey: queryKeys.projects.allP1(token),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllProjects(token!, 20),
  })

  const [metaTitle, setMetaTitle] = useState('')
  const [metaType, setMetaType] = useState('activity')
  const [startsLocal, setStartsLocal] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [metaStatus, setMetaStatus] = useState('draft')
  const [evProjects, setEvProjects] = useState<Set<string>>(new Set())
  const [builderSection, setBuilderSection] = useState('general')
  const [globalSaving, setGlobalSaving] = useState(false)

  const moduleSavers = useRef<Set<() => Promise<void>>>(new Set())
  const [moduleDirtyCount, setModuleDirtyCount] = useState(0)

  const registerModuleSaver = useCallback((fn: () => Promise<void>) => {
    moduleSavers.current.add(fn)
    return () => {
      moduleSavers.current.delete(fn)
    }
  }, [])

  const handleModuleDirtyChange = useCallback((dirty: boolean) => {
    setModuleDirtyCount((prev) => (dirty ? prev + 1 : Math.max(0, prev - 1)))
  }, [])

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
    () => void qc.invalidateQueries({ queryKey: queryKeys.events.detail(id, token) }),
    [qc, id, token],
  )

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

  const handleSaveAll = async () => {
    setGlobalSaving(true)
    try {
      const calls: Promise<unknown>[] = []
      if (metaDirty) calls.push(saveMeta.mutateAsync())
      if (projectsDirty) calls.push(saveEventProjects.mutateAsync())
      for (const saver of moduleSavers.current) calls.push(saver())
      await Promise.all(calls)
      toast.success('Cambios guardados correctamente.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGlobalSaving(false)
    }
  }

  const sortedModules = useMemo(() => {
    const m = detailQ.data?.modules ?? []
    return [...m].sort((a, b) => a.module.sort_order - b.module.sort_order)
  }, [detailQ.data])

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

  return {
    id,
    token,
    detailQ,
    projectsQ,
    metaTitle,
    setMetaTitle,
    metaType,
    setMetaType,
    startsLocal,
    setStartsLocal,
    deadlineLocal,
    setDeadlineLocal,
    metaStatus,
    setMetaStatus,
    evProjects,
    setEvProjects,
    builderSection,
    setBuilderSection,
    globalSaving,
    registerModuleSaver,
    handleModuleDirtyChange,
    invalidateDetail,
    inst,
    metaDirty,
    projectsDirty,
    moduleDirtyCount,
    anythingDirty,
    addModule,
    delModule,
    addGroup,
    addOption,
    handleSaveAll,
    sortedModules,
    headerTitle,
    headerSubtitle,
    scrollToModule,
  }
}
