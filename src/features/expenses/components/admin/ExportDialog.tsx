import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

import { ActionButton } from '@/components/ActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listAllExpenses } from '@/features/expenses/api/expensesApi'
import { DATE_PRESETS, type DatePreset } from '@/lib/datePresets'
import { cn } from '@/lib/utils'

type ProjectOption = { id: string; name: string }

export function ExportDialog({
  open,
  onOpenChange,
  token,
  projectOptions,
  initial,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  token: string
  projectOptions: ProjectOption[]
  initial: { desde: string; hasta: string; project: string; status: string }
}) {
  const [exportDesde, setExportDesde] = useState(initial.desde)
  const [exportHasta, setExportHasta] = useState(initial.hasta)
  const [exportProject, setExportProject] = useState(initial.project)
  const [exportStatus, setExportStatus] = useState(initial.status)
  const [downloading, setDownloading] = useState(false)

  function applyExportPreset(p: DatePreset) {
    setExportDesde(p.desde)
    setExportHasta(p.hasta)
  }

  async function handleDownloadExcel() {
    if (!token || downloading) return
    setDownloading(true)
    try {
      const FETCH_SIZE = 500
      const filters = {
        pageSize: FETCH_SIZE,
        projectId: exportProject,
        status: exportStatus,
        from: exportDesde || undefined,
        to: exportHasta || undefined,
      }
      const first = await listAllExpenses(token, { ...filters, page: 1 })
      const all = [...first.data]
      if (first.total_pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.total_pages - 1 }, (_, i) =>
            listAllExpenses(token, { ...filters, page: i + 2 }),
          ),
        )
        rest.forEach((r) => all.push(...r.data))
      }

      const rows = all.map((e) => ({
        Fecha: new Date(`${e.expense_date}T12:00:00`).toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }),
        Proyecto: e.project_name ?? '',
        Categoría: e.category_name ?? '',
        Descripción: e.description,
        'Monto (ARS)': parseFloat(e.amount),
        Estado: e.status,
        'Cargado por': e.submitter_name ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 40 },
        { wch: 14 }, { wch: 12 }, { wch: 22 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Gastos')

      const desdeLabel = exportDesde ? exportDesde.replace(/-/g, '') : 'inicio'
      const hastaLabel = exportHasta ? exportHasta.replace(/-/g, '') : 'hoy'
      XLSX.writeFile(wb, `gastos_${desdeLabel}_${hastaLabel}.xlsx`)
      onOpenChange(false)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!downloading) onOpenChange(o) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Download className="w-4 h-4 text-primary" />
            </div>
            Exportar gastos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Período
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyExportPreset(p)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                    exportDesde === p.desde && exportHasta === p.hasta
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-desde" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Desde
              </Label>
              <Input
                id="exp-desde"
                type="date"
                value={exportDesde}
                max={exportHasta || undefined}
                onChange={(e) => setExportDesde(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-hasta" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="exp-hasta"
                type="date"
                value={exportHasta}
                min={exportDesde || undefined}
                onChange={(e) => setExportHasta(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Proyecto
            </Label>
            <Select value={exportProject} onValueChange={setExportProject}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </Label>
            <Select value={exportStatus} onValueChange={setExportStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <ActionButton intent="secondary" onClick={() => onOpenChange(false)} disabled={downloading}>
              Cancelar
            </ActionButton>
            <ActionButton
              intent="primary"
              onClick={handleDownloadExcel}
              disabled={downloading || !exportDesde || !exportHasta}
            >
              {downloading
                ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Descargando…</>
                : <><Download className="w-4 h-4 mr-1" />Descargar</>}
            </ActionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
