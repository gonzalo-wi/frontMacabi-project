import { Upload, Download, CheckCircle2, XCircle, Loader2, Users } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBulkInviteFlow } from '@/features/users/hooks/useBulkInviteFlow'
import { downloadBulkInviteTemplate } from '@/features/users/lib/bulkInviteSheet'

interface BulkInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  onDone: () => void
}

export function BulkInviteDialog({ open, onOpenChange, token, onDone }: BulkInviteDialogProps) {
  const flow = useBulkInviteFlow(token, onDone)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (flow.phase === 'sending') return
        if (!o) flow.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            Importar usuarios desde Excel
          </DialogTitle>
          {(flow.phase === 'idle' || flow.phase === 'mode') && (
            <p className="text-sm text-muted-foreground pt-1">
              Subí un Excel o CSV con columnas{' '}
              <span className="font-medium text-foreground">Nombre completo</span> y{' '}
              <span className="font-medium text-foreground">Email</span>. El rol se asigna como{' '}
              <span className="font-medium text-foreground">Usuario</span> por defecto.
            </p>
          )}
        </DialogHeader>

        {flow.phase === 'idle' && (
          <div className="flex flex-col gap-4 flex-1">
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors select-none',
                flow.dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30',
              )}
              onClick={() => flow.fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && flow.fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                flow.setDragging(true)
              }}
              onDragLeave={() => flow.setDragging(false)}
              onDrop={flow.handleDrop}
            >
              <Upload className={cn('w-8 h-8', flow.dragging ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="text-sm font-medium">Arrastrá el archivo aquí o hacé clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx · .xls · .csv</p>
              </div>
              <input
                ref={flow.fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) flow.handleFile(f)
                }}
              />
            </div>

            {flow.parseError && <p className="text-sm text-destructive">{flow.parseError}</p>}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={downloadBulkInviteTemplate}
                className="gap-1.5 text-muted-foreground"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar plantilla
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {flow.phase === 'mode' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Elegí cómo importar {flow.validCount} usuario{flow.validCount !== 1 ? 's' : ''} válido
              {flow.validCount !== 1 ? 's' : ''}:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  flow.mode === 'add'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
                onClick={() => flow.setMode('add')}
              >
                <p className="text-sm font-semibold">Solo agregar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Carga usuarios sin enviar correo. Podés invitarlos después.
                </p>
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  flow.mode === 'invite'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
                onClick={() => flow.setMode('invite')}
              >
                <p className="text-sm font-semibold">Agregar e invitar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Carga usuarios y envía invitación por correo a cada uno.
                </p>
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={flow.reset}>
                Volver
              </Button>
              <Button onClick={flow.confirmMode}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {flow.phase === 'preview' && (
          <>
            <div className="flex items-center gap-3 text-sm py-1 shrink-0">
              <span className="text-emerald-600 font-medium">
                {flow.validCount} para {flow.mode === 'add' ? 'agregar' : 'invitar'}
              </span>
              {flow.invalidCount > 0 && (
                <span className="text-destructive font-medium">
                  · {flow.invalidCount} con error (se omitirán)
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg divide-y text-sm min-h-0">
              {flow.rows.map((row) => (
                <div
                  key={row.index}
                  className={cn('flex items-center gap-3 px-3 py-2.5', row.error && 'bg-destructive/5')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {row.name || <span className="text-muted-foreground italic">sin nombre</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                  </div>
                  {row.error ? (
                    <span className="text-xs text-destructive shrink-0 text-right">{row.error}</span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1 shrink-0">
              <Button variant="outline" onClick={flow.goBackToMode}>
                Volver
              </Button>
              <Button onClick={flow.handleSend} disabled={flow.validCount === 0}>
                <Users className="w-4 h-4 mr-1.5" />
                {flow.mode === 'add'
                  ? `Agregar ${flow.validCount} usuario${flow.validCount !== 1 ? 's' : ''}`
                  : `Enviar ${flow.validCount} invitación${flow.validCount !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </>
        )}

        {flow.phase === 'sending' && (
          <div className="flex flex-col items-center justify-center gap-5 py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">
                {flow.mode === 'add' ? 'Agregando usuarios…' : 'Enviando invitaciones…'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {flow.progress} de {flow.totalValid}
              </p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${flow.totalValid > 0 ? Math.round((flow.progress / flow.totalValid) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {flow.phase === 'done' && (
          <>
            <div className="flex gap-4 py-2 shrink-0">
              {flow.successCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">
                    {flow.successCount}{' '}
                    {flow.mode === 'add'
                      ? `agregada${flow.successCount !== 1 ? 's' : ''}`
                      : `enviada${flow.successCount !== 1 ? 's' : ''}`}
                  </span>
                </div>
              )}
              {flow.failCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {flow.failCount} fallida{flow.failCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {flow.failCount > 0 && (
              <div className="flex-1 overflow-y-auto border rounded-lg divide-y text-sm min-h-0">
                {flow.results
                  .filter((r) => r.status === 'error')
                  .map((row) => (
                    <div key={row.index} className="flex items-start gap-3 px-3 py-2.5 bg-destructive/5">
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{row.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                        {row.message && (
                          <p className="text-xs text-destructive mt-0.5">{row.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-end pt-1 shrink-0">
              <Button
                onClick={() => {
                  flow.reset()
                  onOpenChange(false)
                }}
              >
                Cerrar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
