import { useParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProyectoGastosPage() {
  const { id: projectId } = useParams<{ id: string }>()

  if (!projectId) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Gastos por período</CardTitle>
            <CardDescription>
              Registro de movimientos y presupuestos del proyecto agrupados por mes o trimestre.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Próximamente</p>
            <p className="text-xs text-muted-foreground">
              El módulo de gastos estará disponible en una próxima versión.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
