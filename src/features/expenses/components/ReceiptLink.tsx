import { useState } from 'react'

import { receiptViewUrl } from '@/features/expenses/api/expensesApi'
import { receiptFileNameFromPath } from '@/features/expenses/utils/receipt'
import { cn } from '@/lib/utils'

type Props = {
  token: string
  expenseId: string
  storagePath: string
  className?: string
  onError?: (message: string) => void
}

export function ReceiptLink({ token, expenseId, storagePath, className, onError }: Props) {
  const [busy, setBusy] = useState(false)
  const label = receiptFileNameFromPath(storagePath)

  return (
    <button
      type="button"
      disabled={busy}
      className={cn(
        'text-xs text-primary underline underline-offset-2 hover:text-primary/80 disabled:opacity-50 text-left',
        className,
      )}
      onClick={async () => {
        setBusy(true)
        try {
          const { view_url } = await receiptViewUrl(token, expenseId)
          window.open(view_url, '_blank', 'noopener,noreferrer')
        } catch {
          onError?.('No se pudo abrir el comprobante.')
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? 'Abriendo…' : label}
    </button>
  )
}
