import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Camera,
  ChevronRight,
  Upload,
  FileImage,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  expenses as initialExpenses,
  formatCurrency,
  formatShortDate,
  getStatusColor,
  getStatusLabel,
  type Expense,
} from '@/lib/mock-data'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/PageHeader'

export default function ReembolsosPage() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setAttachment(null)
    setIsEditing(false)
  }

  const handleNewExpense = () => {
    resetForm()
    setShowNewExpense(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setAmount(expense.amount.toString())
    setDescription(expense.description)
    setIsEditing(true)
    setSelectedExpense(expense)
    setShowDetail(false)
    setShowNewExpense(true)
  }

  const handleSubmit = () => {
    if (!amount || !description) return

    if (isEditing && selectedExpense) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === selectedExpense.id
            ? { ...e, amount: parseFloat(amount), description }
            : e,
        ),
      )
    } else {
      const newExpense: Expense = {
        id: `expense-${Date.now()}`,
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString().split('T')[0],
        attachmentUrl: '/receipts/new-receipt.jpg',
        status: 'pending',
        userId: 'user-1',
        userName: 'Daniel Cohen',
      }
      setExpenses((prev) => [newExpense, ...prev])
    }

    setShowNewExpense(false)
    resetForm()
  }

  const handleDelete = () => {
    if (selectedExpense) {
      setExpenses((prev) => prev.filter((e) => e.id !== selectedExpense.id))
      setShowDeleteDialog(false)
      setShowDetail(false)
      setSelectedExpense(null)
    }
  }

  const handleViewDetail = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowDetail(true)
  }

  const getStatusIcon = (status: Expense['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'pending':  return <Clock className="w-4 h-4 text-warning-foreground" />
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />
    }
  }

  const pendingTotal = expenses
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0)

  const approvedTotal = expenses
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0)

  const newAction = (
    <Button
      size="sm"
      variant="secondary"
      className="bg-white/15 text-sidebar-foreground border-white/15 hover:bg-white/25 lg:bg-primary lg:text-primary-foreground lg:hover:bg-primary/90"
      onClick={handleNewExpense}
    >
      <Plus className="w-4 h-4 mr-1" />
      Nuevo
    </Button>
  )

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Receipt}
        title="Reembolsos"
        subtitle="Cargá y seguí tus gastos"
        action={newAction}
      />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-warning-foreground" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Pendiente</p>
              </div>
              <p className="text-xl font-bold text-warning-foreground">
                {formatCurrency(pendingTotal)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Aprobado</p>
              </div>
              <p className="text-xl font-bold text-success">
                {formatCurrency(approvedTotal)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expenses list */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Mis gastos</CardTitle>
              <span className="text-xs text-muted-foreground">{expenses.length} registros</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            {expenses.length === 0 ? (
              <div className="text-center py-10">
                <Receipt className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No tenés gastos cargados</p>
                <Button variant="outline" size="sm" onClick={handleNewExpense}>
                  <Plus className="w-4 h-4 mr-1" />
                  Cargar primer gasto
                </Button>
              </div>
            ) : (
              expenses.map((expense) => (
                <button
                  key={expense.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                  onClick={() => handleViewDetail(expense)}
                >
                  <div className="p-2 rounded-lg bg-card border border-border shrink-0">
                    {getStatusIcon(expense.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(expense.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(expense.amount)}</p>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(expense.status)} text-[10px] px-1.5 py-0 mt-0.5`}
                    >
                      {getStatusLabel(expense.status)}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2">Información importante</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Adjuntá siempre el comprobante de compra
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Los gastos pendientes pueden ser editados
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Los reembolsos aprobados se procesan los viernes
            </li>
          </ul>
        </div>
      </div>

      {/* New/Edit Expense Drawer */}
      <Drawer open={showNewExpense} onOpenChange={setShowNewExpense}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEditing ? 'Editar gasto' : 'Nuevo gasto'}</DrawerTitle>
            <DrawerDescription>
              {isEditing
                ? 'Modificá los datos del gasto'
                : 'Completá los datos para cargar un nuevo gasto'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (ARS)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 h-12 text-lg font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Ej: Materiales para manualidades"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Comprobante</Label>
              <label className="block border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer">
                {attachment ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileImage className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{attachment.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tocá para sacar foto o subir archivo
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!amount || !description}>
              {isEditing ? 'Guardar cambios' : 'Cargar gasto'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Expense Detail Drawer */}
      <Drawer open={showDetail} onOpenChange={setShowDetail}>
        <DrawerContent>
          {selectedExpense && (
            <>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <DrawerTitle>Detalle del gasto</DrawerTitle>
                  <Badge className={getStatusColor(selectedExpense.status)}>
                    {getStatusLabel(selectedExpense.status)}
                  </Badge>
                </div>
              </DrawerHeader>

              <div className="px-4 pb-4 space-y-4">
                <div className="text-center py-4">
                  <p className="text-4xl font-bold tracking-tight">
                    {formatCurrency(selectedExpense.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {formatShortDate(selectedExpense.date)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Descripción</p>
                    <p className="text-sm">{selectedExpense.description}</p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Comprobante</p>
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-primary" />
                      <span className="text-sm">receipt-{selectedExpense.id}.jpg</span>
                    </div>
                  </div>

                  {selectedExpense.status === 'rejected' && selectedExpense.rejectionReason && (
                    <div className="p-3 bg-destructive/8 border border-destructive/20 rounded-xl">
                      <p className="text-xs text-destructive mb-1 font-medium">Motivo del rechazo</p>
                      <p className="text-sm">{selectedExpense.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>

              <DrawerFooter>
                {selectedExpense.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handleEditExpense(selectedExpense)}>
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Eliminar
                    </Button>
                  </div>
                )}
                <DrawerClose asChild>
                  <Button variant={selectedExpense.status === 'pending' ? 'ghost' : 'outline'}>
                    Cerrar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
