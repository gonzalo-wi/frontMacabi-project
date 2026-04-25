import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Trash2
} from 'lucide-react'
import { 
  expenses as initialExpenses, 
  formatCurrency,
  formatShortDate,
  getStatusColor,
  getStatusLabel,
  type Expense
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

export default function ReembolsosPage() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
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
      setExpenses(prev => prev.map(e => 
        e.id === selectedExpense.id 
          ? { ...e, amount: parseFloat(amount), description }
          : e
      ))
    } else {
      const newExpense: Expense = {
        id: `expense-${Date.now()}`,
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString().split('T')[0],
        attachmentUrl: '/receipts/new-receipt.jpg',
        status: 'pending',
        userId: 'user-1',
        userName: 'Daniel Cohen'
      }
      setExpenses(prev => [newExpense, ...prev])
    }

    setShowNewExpense(false)
    resetForm()
  }

  const handleDelete = () => {
    if (selectedExpense) {
      setExpenses(prev => prev.filter(e => e.id !== selectedExpense.id))
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
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-foreground" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />
    }
  }

  const pendingTotal = expenses
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0)

  const approvedTotal = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 pt-6 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-foreground/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Reembolsos</h1>
              <p className="text-sm opacity-80">Cargá y seguí tus gastos</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={handleNewExpense}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
              <p className="text-lg font-bold text-warning-foreground">
                {formatCurrency(pendingTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Aprobado</p>
              <p className="text-lg font-bold text-success">
                {formatCurrency(approvedTotal)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expenses list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mis gastos</CardTitle>
            <CardDescription>{expenses.length} registros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tenés gastos cargados</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={handleNewExpense}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Cargar primer gasto
                </Button>
              </div>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleViewDetail(expense)}
                >
                  <div className="p-2 rounded-lg bg-card">
                    {getStatusIcon(expense.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(expense.amount)}</p>
                    <Badge variant="outline" className={`${getStatusColor(expense.status)} text-[10px]`}>
                      {getStatusLabel(expense.status)}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2">Información importante</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Adjuntá siempre el comprobante de compra</li>
              <li>• Los gastos pendientes pueden ser editados</li>
              <li>• Los reembolsos aprobados se procesan los viernes</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* New/Edit Expense Drawer */}
      <Drawer open={showNewExpense} onOpenChange={setShowNewExpense}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {isEditing ? 'Editar gasto' : 'Nuevo gasto'}
            </DrawerTitle>
            <DrawerDescription>
              {isEditing 
                ? 'Modificá los datos del gasto'
                : 'Completá los datos para cargar un nuevo gasto'
              }
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (ARS)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 h-12 text-lg"
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
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer">
                {attachment ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileImage className="w-5 h-5 text-primary" />
                    <span className="text-sm">{attachment.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-2">
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
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button 
              onClick={handleSubmit}
              disabled={!amount || !description}
            >
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
                  <p className="text-3xl font-bold">{formatCurrency(selectedExpense.amount)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatShortDate(selectedExpense.date)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm">{selectedExpense.description}</p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Comprobante</p>
                    <div className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-primary" />
                      <span className="text-sm">receipt-{selectedExpense.id}.jpg</span>
                    </div>
                  </div>

                  {selectedExpense.status === 'rejected' && selectedExpense.rejectionReason && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-xs text-destructive mb-1">Motivo del rechazo</p>
                      <p className="text-sm">{selectedExpense.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>

              <DrawerFooter>
                {selectedExpense.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => handleEditExpense(selectedExpense)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
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

      {/* Delete Confirmation Dialog */}
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
