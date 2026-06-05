import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, Download, CheckCircle2, XCircle, Loader2, Users,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createUserInvitation } from '@/lib/api/admin'
import { ApiError } from '@/lib/api/apiClient'

const BATCH_SIZE = 10

type ParsedRow = {
  index: number
  name: string
  email: string
  error?: string
}

type RowResult = ParsedRow & {
  status: 'success' | 'error'
  message?: string
}

type Phase = 'idle' | 'preview' | 'sending' | 'done'

function parseSheet(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        if (rows.length === 0) { resolve([]); return }

        const keys = Object.keys(rows[0])
        const nameKey = keys.find((k) => /nombre/i.test(k) || /^name$/i.test(k)) ?? ''
        const emailKey = keys.find((k) => /e[.-]?mail/i.test(k) || /correo/i.test(k)) ?? ''

        const parsed: ParsedRow[] = rows
          .map((row, i) => {
            const name = String(row[nameKey] ?? '').trim()
            const email = String(row[emailKey] ?? '').trim().toLowerCase()

            let error: string | undefined
            if (!name) error = 'Nombre vacío'
            else if (!email) error = 'Email vacío'
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error = 'Email inválido'

            return { index: i, name, email, error }
          })
          .filter((r) => r.name || r.email)

        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error leyendo el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

async function sendBatch(token: string, batch: ParsedRow[]): Promise<RowResult[]> {
  const settled = await Promise.allSettled(
    batch.map((row) =>
      createUserInvitation(token, { name: row.name, email: row.email, role: 'user' }),
    ),
  )
  return settled.map((r, i) => ({
    ...batch[i],
    status: r.status === 'fulfilled' ? 'success' : 'error',
    message:
      r.status === 'rejected'
        ? r.reason instanceof ApiError
          ? r.reason.message
          : r.reason instanceof Error
            ? r.reason.message
            : 'Error desconocido'
        : undefined,
  }))
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre completo', 'Email'],
    ['María García', 'maria@ejemplo.com'],
    ['Juan Pérez', 'juan@ejemplo.com'],
  ])
  ws['!cols'] = [{ wch: 28 }, { wch: 28 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
  XLSX.writeFile(wb, 'plantilla_usuarios.xlsx')
}

interface BulkInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  onDone: () => void
}

export function BulkInviteDialog({ open, onOpenChange, token, onDone }: BulkInviteDialogProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [progress, setProgress] = useState(0)
  const [parseError, setParseError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setPhase('idle')
    setRows([])
    setResults([])
    setProgress(0)
    setParseError(null)
    setDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(file: File) {
    setParseError(null)
    try {
      const parsed = await parseSheet(file)
      if (parsed.length === 0) {
        setParseError('El archivo no contiene filas válidas. Verificá que tenga columnas Nombre y Email.')
        return
      }
      setRows(parsed)
      setPhase('preview')
    } catch {
      setParseError('No se pudo leer el archivo. Verificá que sea .xlsx, .xls o .csv válido.')
    }
  }

  async function handleSend() {
    const validRows = rows.filter((r) => !r.error)
    if (validRows.length === 0) return

    setPhase('sending')
    setProgress(0)
    const allResults: RowResult[] = []

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)
      const batchResults = await sendBatch(token, batch)
      allResults.push(...batchResults)
      setProgress(allResults.length)
    }

    const skippedRows: RowResult[] = rows
      .filter((r) => r.error)
      .map((r) => ({ ...r, status: 'error', message: r.error }))

    setResults([...allResults, ...skippedRows])
    setPhase('done')
    onDone()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const validCount = rows.filter((r) => !r.error).length
  const invalidCount = rows.filter((r) => r.error).length
  const successCount = results.filter((r) => r.status === 'success').length
  const failCount = results.filter((r) => r.status === 'error').length
  const totalValid = rows.filter((r) => !r.error).length

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (phase === 'sending') return
        if (!o) reset()
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
          {phase === 'idle' && (
            <p className="text-sm text-muted-foreground pt-1">
              Subí un Excel o CSV con columnas <span className="font-medium text-foreground">Nombre completo</span> y{' '}
              <span className="font-medium text-foreground">Email</span>. El rol se asigna como{' '}
              <span className="font-medium text-foreground">Usuario</span> por defecto.
            </p>
          )}
        </DialogHeader>

        {/* ── IDLE: file picker ── */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-4 flex-1">
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors select-none',
                dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30',
              )}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className={cn('w-8 h-8', dragging ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="text-sm font-medium">Arrastrá el archivo aquí o hacé clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx · .xls · .csv</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>

            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={downloadTemplate}
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

        {/* ── PREVIEW ── */}
        {phase === 'preview' && (
          <>
            <div className="flex items-center gap-3 text-sm py-1 shrink-0">
              <span className="text-emerald-600 font-medium">
                {validCount} para enviar
              </span>
              {invalidCount > 0 && (
                <span className="text-destructive font-medium">
                  · {invalidCount} con error (se omitirán)
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg divide-y text-sm min-h-0">
              {rows.map((row) => (
                <div
                  key={row.index}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5',
                    row.error && 'bg-destructive/5',
                  )}
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
              <Button variant="outline" onClick={reset}>
                Volver
              </Button>
              <Button onClick={handleSend} disabled={validCount === 0}>
                <Users className="w-4 h-4 mr-1.5" />
                Enviar {validCount} invitación{validCount !== 1 ? 'es' : ''}
              </Button>
            </div>
          </>
        )}

        {/* ── SENDING ── */}
        {phase === 'sending' && (
          <div className="flex flex-col items-center justify-center gap-5 py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Enviando invitaciones…</p>
              <p className="text-sm text-muted-foreground mt-1">
                {progress} de {totalValid}
              </p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalValid > 0 ? Math.round((progress / totalValid) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <>
            <div className="flex gap-4 py-2 shrink-0">
              {successCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">{successCount} enviada{successCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {failCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">{failCount} fallida{failCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {failCount > 0 && (
              <div className="flex-1 overflow-y-auto border rounded-lg divide-y text-sm min-h-0">
                {results
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
                  reset()
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
