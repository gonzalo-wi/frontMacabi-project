import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createEventInstance } from '@/features/events/api/eventsApi'
import { fromDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import { labelInstanceStatus } from '@/features/events/lib/eventLabels'

export function CreateJornadaDialog({
  open,
  onOpenChange,
  token,
  onCreated,
  onError,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  token: string
  onCreated: () => void
  onError: (message: string) => void
}) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('Nueva jornada')
  const [startsLocal, setStartsLocal] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [statusDraft, setStatusDraft] = useState('draft')

  const createMut = useMutation({
    mutationFn: async () => {
      if (!startsLocal) throw new Error('Indicá fecha y hora de inicio')
      await createEventInstance(token, {
        title,
        starts_at: fromDatetimeLocalValue(startsLocal),
        response_deadline_at: deadlineLocal ? fromDatetimeLocalValue(deadlineLocal) : null,
        status: statusDraft,
        type: 'activity',
      })
    },
    onSuccess: async () => {
      onCreated()
      onOpenChange(false)
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (e) => onError(e instanceof Error ? e.message : 'Error al crear'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva jornada</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="Título" htmlFor="create-title">
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </FormField>
          <FormField label="Inicio" htmlFor="create-starts">
            <Input
              id="create-starts"
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              className="h-11"
            />
          </FormField>
          <FormField label="Límite de respuestas (opcional)" htmlFor="create-deadline">
            <Input
              id="create-deadline"
              type="datetime-local"
              value={deadlineLocal}
              onChange={(e) => setDeadlineLocal(e.target.value)}
              className="h-11"
            />
          </FormField>
          <FormField label="Estado inicial">
            <Select value={statusDraft} onValueChange={setStatusDraft}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{labelInstanceStatus('draft')}</SelectItem>
                <SelectItem value="open">{labelInstanceStatus('open')}</SelectItem>
                <SelectItem value="closed">{labelInstanceStatus('closed')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <Button
            className="w-full"
            disabled={createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear jornada'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
