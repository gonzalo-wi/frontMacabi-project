/** Last segment of the storage path (uploaded file name). */
export function receiptFileNameFromPath(storagePath: string): string {
  const trimmed = storagePath.trim()
  if (!trimmed) return 'comprobante'
  const parts = trimmed.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? 'comprobante'
}
