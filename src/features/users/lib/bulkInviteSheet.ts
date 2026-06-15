import * as XLSX from 'xlsx'

import { createUserInvitation } from '@/features/users/api/usersApi'
import { ApiError } from '@/lib/api/apiClient'

export const BATCH_SIZE = 10

export type BulkInvitePhase = 'idle' | 'preview' | 'sending' | 'done'

export type ParsedInviteRow = {
  index: number
  name: string
  email: string
  error?: string
}

export type RowInviteResult = ParsedInviteRow & {
  status: 'success' | 'error'
  message?: string
}

export function parseBulkInviteSheet(file: File): Promise<ParsedInviteRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        if (sheetRows.length === 0) {
          resolve([])
          return
        }

        const keys = Object.keys(sheetRows[0])
        const nameKey = keys.find((k) => /nombre/i.test(k) || /^name$/i.test(k)) ?? ''
        const emailKey = keys.find((k) => /e[.-]?mail/i.test(k) || /correo/i.test(k)) ?? ''

        const parsed: ParsedInviteRow[] = sheetRows
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

export async function sendBulkInviteBatch(
  token: string,
  batch: ParsedInviteRow[],
): Promise<RowInviteResult[]> {
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

export function downloadBulkInviteTemplate() {
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
