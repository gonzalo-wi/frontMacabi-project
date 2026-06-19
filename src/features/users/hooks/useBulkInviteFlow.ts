import { useState, useRef, useCallback } from 'react'

import {
  BATCH_SIZE,
  parseBulkInviteSheet,
  sendBulkUserBatch,
} from '@/features/users/lib/bulkInviteSheet'
import type {
  BulkImportMode,
  BulkInvitePhase,
  ParsedInviteRow,
  RowInviteResult,
} from '@/features/users/lib/bulkInviteSheet'

export function useBulkInviteFlow(token: string, onDone: () => void) {
  const [phase, setPhase] = useState<BulkInvitePhase>('idle')
  const [mode, setMode] = useState<BulkImportMode>('add')
  const [rows, setRows] = useState<ParsedInviteRow[]>([])
  const [results, setResults] = useState<RowInviteResult[]>([])
  const [progress, setProgress] = useState(0)
  const [parseError, setParseError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setPhase('idle')
    setMode('add')
    setRows([])
    setResults([])
    setProgress(0)
    setParseError(null)
    setDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    try {
      const parsed = await parseBulkInviteSheet(file)
      if (parsed.length === 0) {
        setParseError('El archivo no contiene filas válidas. Verificá que tenga columnas Nombre y Email.')
        return
      }
      setRows(parsed)
      setPhase('mode')
    } catch {
      setParseError('No se pudo leer el archivo. Verificá que sea .xlsx, .xls o .csv válido.')
    }
  }, [])

  const handleSend = useCallback(async () => {
    const validRows = rows.filter((r) => !r.error)
    if (validRows.length === 0) return

    setPhase('sending')
    setProgress(0)
    const allResults: RowInviteResult[] = []

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)
      const batchResults = await sendBulkUserBatch(token, batch, mode)
      allResults.push(...batchResults)
      setProgress(allResults.length)
    }

    const skippedRows: RowInviteResult[] = rows
      .filter((r) => r.error)
      .map((r) => ({ ...r, status: 'error', message: r.error }))

    setResults([...allResults, ...skippedRows])
    setPhase('done')
    onDone()
  }, [rows, token, onDone, mode])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const confirmMode = useCallback(() => {
    setPhase('preview')
  }, [])

  const goBackToMode = useCallback(() => {
    setPhase('mode')
  }, [])

  const validCount = rows.filter((r) => !r.error).length
  const invalidCount = rows.filter((r) => r.error).length
  const successCount = results.filter((r) => r.status === 'success').length
  const failCount = results.filter((r) => r.status === 'error').length
  const totalValid = validCount

  return {
    phase,
    mode,
    setMode,
    rows,
    results,
    progress,
    parseError,
    dragging,
    setDragging,
    fileInputRef,
    reset,
    handleFile,
    handleSend,
    handleDrop,
    confirmMode,
    goBackToMode,
    validCount,
    invalidCount,
    successCount,
    failCount,
    totalValid,
  }
}
