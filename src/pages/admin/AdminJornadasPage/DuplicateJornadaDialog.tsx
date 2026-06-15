import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  duplicateEventFromDetail,
  getEventDetail,
} from '@/features/events/api/eventsApi'
import {
  addCalendarDaysToIso,
  fromDatetimeLocalValue,
  newDeadlinePreservingOffset,
  toDatetimeLocalValue,
} from '@/features/events/lib/datetimeLocal'
import { ApiError } from '@/lib/api/apiClient'

export function DuplicateJornadaDialog({
  open,
  onOpenChange,
  seedId,
  token,
  onDuplicated,
  onError,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  seedId: string | null
  token: string
  onDuplicated: () => void
  onError: (message: string) => void
}) {
  const qc = useQueryClient()
  const [dupTitle, setDupTitle] = useState('')
  const [dupStartsLocal, setDupStartsLocal] = useState('')
  const [dupDeadlineLocal, setDupDeadlineLocal] = useState('')
  const initializedRef = useRef<string | null>(null)

  const dupDetailQ = useQuery({
    queryKey: ['admin-event-detail-dup', seedId],
    enabled: Boolean(token && seedId) && open,
    queryFn: () => getEventDetail(token, seedId!),
  })

  // Pre-llena el formulario cuando llegan los datos de la jornada origen.
  useEffect(() => {
    if (!open) return
    const data = dupDetailQ.data
    if (!data?.instance || data.instance.id !== seedId) return
    if (initializedRef.current === seedId) return

    const inst = data.instance
    const newStartIso = addCalendarDaysToIso(inst.starts_at, 7)
    setDupStartsLocal(toDatetimeLocalValue(newStartIso))
    setDupTitle(`${inst.title} (copia)`)
    if (inst.response_deadline_at) {
      setDupDeadlineLocal(
        toDatetimeLocalValue(
          newDeadlinePreservingOffset(inst.starts_at, inst.response_deadline_at, newStartIso),
        ),
      )
    } else {
      setDupDeadlineLocal('')
    }
    initializedRef.current = seedId
  }, [open, seedId, dupDetailQ.data])

  function handleClose(o: boolean) {
    if (!o) initializedRef.current = null
    onOpenChange(o)
  }

  function onDupStartsChange(v: string) {
    setDupStartsLocal(v)
    const d = dupDetailQ.data
    if (!d?.instance.response_deadline_at || !v) return
    const inst = d.instance
    const dlIso = newDeadlinePreservingOffset(
      inst.starts_at,
      inst.response_deadline_at!,
      fromDatetimeLocalValue(v),
    )
    setDupDeadlineLocal(toDatetimeLocalValue(dlIso))
  }

  const dupMut = useMutation({
    mutationFn: async () => {
      if (!dupDetailQ.data) throw new Error('Sin datos de la jornada')
      await duplicateEventFromDetail(token, dupDetailQ.data, {
        title: dupTitle.trim() || undefined,
        starts_at: fromDatetimeLocalValue(dupStartsLocal),
        response_deadline_at: dupDeadlineLocal ? fromDatetimeLocalValue(dupDeadlineLocal) : null,
      })
    },
    onSuccess: async () => {
      initializedRef.current = null
      onDuplicated()
      onOpenChange(false)
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (e) => onError(e instanceof Error ? e.message : 'Error al duplicar'),
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar jornada</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Se copian el formulario, proyectos y preguntas. Elegí la nueva fecha de inicio; si había límite de
            respuestas, se desplaza el mismo margen respecto del inicio (podés ajustarlo).
          </p>
        </DialogHeader>
        {dupDetailQ.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando datos de la jornada…
          </div>
        )}
        {dupDetailQ.isError && (
          <p className="text-sm text-destructive py-2">
            {dupDetailQ.error instanceof ApiError ? dupDetailQ.error.message : 'No se pudo cargar la jornada'}
          </p>
        )}
        {dupDetailQ.data && (
          <div className="space-y-3">
            <FormField label="Título de la copia" htmlFor="dup-title">
              <Input
                id="dup-title"
                value={dupTitle}
                onChange={(e) => setDupTitle(e.target.value)}
                className="h-11"
              />
            </FormField>
            <FormField
              label="Inicio de la copia"
              htmlFor="dup-starts"
              hint="Por defecto: misma hora del original, una semana después."
            >
              <Input
                id="dup-starts"
                type="datetime-local"
                value={dupStartsLocal}
                onChange={(e) => onDupStartsChange(e.target.value)}
                className="h-11"
              />
            </FormField>
            <FormField label="Límite de respuestas (opcional)" htmlFor="dup-deadline">
              <Input
                id="dup-deadline"
                type="datetime-local"
                value={dupDeadlineLocal}
                onChange={(e) => setDupDeadlineLocal(e.target.value)}
                className="h-11"
              />
            </FormField>
            <Button
              className="w-full"
              disabled={dupMut.isPending || !dupStartsLocal}
              onClick={() => dupMut.mutate()}
            >
              {dupMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear copia en borrador'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
