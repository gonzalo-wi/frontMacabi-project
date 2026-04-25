import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Laptop,
  Palette,
  Gamepad2,
  Dumbbell,
  Filter,
} from 'lucide-react'
import {
  inventoryItems as initialItems,
  userReservations as initialReservations,
  formatShortDate,
  type InventoryItem,
  type Reservation,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { cn } from '@/lib/utils'

export default function ReservasPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showReserveDrawer, setShowReserveDrawer] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const [reserveDate, setReserveDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const categories = [...new Set(items.map((item) => item.category))]

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const activeReservations = reservations.filter((r) => !r.returned)
  const pastReservations = reservations.filter((r) => r.returned)

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tecnología':   return <Laptop className="w-4 h-4" />
      case 'manualidades': return <Palette className="w-4 h-4" />
      case 'juegos':       return <Gamepad2 className="w-4 h-4" />
      case 'deportes':     return <Dumbbell className="w-4 h-4" />
      default:             return <Package className="w-4 h-4" />
    }
  }

  const handleReserve = (item: InventoryItem) => {
    setSelectedItem(item)
    setReserveDate('')
    setStartTime('')
    setEndTime('')
    setShowReserveDrawer(true)
  }

  const handleConfirmReservation = () => {
    if (!selectedItem || !reserveDate || !startTime || !endTime) return

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      userId: 'user-1',
      userName: 'Daniel Cohen',
      date: reserveDate,
      startTime,
      endTime,
      returned: false,
    }

    setReservations((prev) => [...prev, newReservation])
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              available: false,
              currentReservation: {
                userId: 'user-1',
                userName: 'Daniel Cohen',
                date: reserveDate,
                startTime,
                endTime,
              },
            }
          : item,
      ),
    )
    setShowReserveDrawer(false)
  }

  const handleReturn = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setShowReturnDialog(true)
  }

  const confirmReturn = () => {
    if (!selectedReservation) return

    setReservations((prev) =>
      prev.map((r) =>
        r.id === selectedReservation.id ? { ...r, returned: true } : r,
      ),
    )
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedReservation.itemId
          ? { ...item, available: true, currentReservation: undefined }
          : item,
      ),
    )
    setShowReturnDialog(false)
    setSelectedReservation(null)
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Package} title="Reservas" subtitle="Reservá materiales del stock" />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="mis-reservas">
              Mis reservas
              {activeReservations.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                  {activeReservations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Stock tab ── */}
          <TabsContent value="stock" className="space-y-4 mt-4">
            {/* Search & filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No se encontraron items</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      'overflow-hidden shadow-sm transition-opacity',
                      !item.available && 'opacity-70',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2.5 rounded-xl shrink-0',
                          item.available ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                          {getCategoryIcon(item.category)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm leading-snug">{item.name}</h3>
                            {item.available ? (
                              <Badge variant="outline" className="text-success border-success/40 text-[10px] px-1.5 py-0 shrink-0">
                                Disponible
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                Reservado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70">{item.category}</p>

                          {!item.available && item.currentReservation && (
                            <div className="mt-2.5 p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{item.currentReservation.userName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {formatShortDate(item.currentReservation.date)} · {item.currentReservation.startTime}–{item.currentReservation.endTime}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {item.available && (
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleReserve(item)}
                        >
                          Reservar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Mis reservas tab ── */}
          <TabsContent value="mis-reservas" className="space-y-4 mt-4">
            {activeReservations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Activas
                </h3>
                {activeReservations.map((res) => (
                  <Card key={res.id} className="shadow-sm border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5">
                          <h4 className="font-semibold text-sm">{res.itemName}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatShortDate(res.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {res.startTime} – {res.endTime}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleReturn(res)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Devolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pastReservations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Historial
                </h3>
                {pastReservations.map((res) => (
                  <Card key={res.id} className="bg-muted/30 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm text-muted-foreground">{res.itemName}</h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatShortDate(res.date)}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Devuelto</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {reservations.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No tenés reservas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info */}
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2">Información importante</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Devolvé los items al finalizar tu reserva
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Si no devolvés, el item seguirá no disponible
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Cuidá los materiales del club
            </li>
          </ul>
        </div>
      </div>

      {/* Reserve Drawer */}
      <Drawer open={showReserveDrawer} onOpenChange={setShowReserveDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Reservar item</DrawerTitle>
            <DrawerDescription>
              {selectedItem?.name} · {selectedItem?.category}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={reserveDate}
                onChange={(e) => setReserveDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">Hora inicio</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Hora fin</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2.5 rounded-lg">
              El item quedará reservado a tu nombre hasta que lo marques como devuelto.
            </p>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleConfirmReservation}
              disabled={!reserveDate || !startTime || !endTime}
            >
              Confirmar reserva
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Return Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como devuelto?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmá que devolviste &quot;{selectedReservation?.itemName}&quot;. El item volverá a estar disponible para otros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturn}>
              Confirmar devolución
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
