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
  Filter
} from 'lucide-react'
import { 
  inventoryItems as initialItems, 
  userReservations as initialReservations,
  formatShortDate,
  type InventoryItem,
  type Reservation
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

export default function ReservasPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showReserveDrawer, setShowReserveDrawer] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  // Reservation form state
  const [reserveDate, setReserveDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const categories = [...new Set(items.map(item => item.category))]

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const activeReservations = reservations.filter(r => !r.returned)
  const pastReservations = reservations.filter(r => r.returned)

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'tecnología':
        return <Laptop className="w-4 h-4" />
      case 'manualidades':
        return <Palette className="w-4 h-4" />
      case 'juegos':
        return <Gamepad2 className="w-4 h-4" />
      case 'deportes':
        return <Dumbbell className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
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
      returned: false
    }

    setReservations(prev => [...prev, newReservation])
    setItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { 
            ...item, 
            available: false,
            currentReservation: {
              userId: 'user-1',
              userName: 'Daniel Cohen',
              date: reserveDate,
              startTime,
              endTime
            }
          }
        : item
    ))
    setShowReserveDrawer(false)
  }

  const handleReturn = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setShowReturnDialog(true)
  }

  const confirmReturn = () => {
    if (!selectedReservation) return

    setReservations(prev => prev.map(r =>
      r.id === selectedReservation.id ? { ...r, returned: true } : r
    ))
    setItems(prev => prev.map(item =>
      item.id === selectedReservation.itemId
        ? { ...item, available: true, currentReservation: undefined }
        : item
    ))
    setShowReturnDialog(false)
    setSelectedReservation(null)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 pt-6 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-foreground/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Reservas</h1>
            <p className="text-sm opacity-80">Reservá materiales del stock</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="mis-reservas">
              Mis reservas
              {activeReservations.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeReservations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4 mt-4">
            {/* Search and filters */}
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
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items grid */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No se encontraron items</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <Card 
                    key={item.id}
                    className={`overflow-hidden ${!item.available ? 'opacity-75' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${item.available ? 'bg-primary/10' : 'bg-muted'}`}>
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">{item.name}</h3>
                            {item.available ? (
                              <Badge variant="outline" className="text-success border-success text-[10px]">
                                Disponible
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Reservado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {item.category}
                          </p>

                          {!item.available && item.currentReservation && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{item.currentReservation.userName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {formatShortDate(item.currentReservation.date)} • {item.currentReservation.startTime} - {item.currentReservation.endTime}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        {item.available && (
                          <Button 
                            size="sm"
                            onClick={() => handleReserve(item)}
                          >
                            Reservar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="mis-reservas" className="space-y-4 mt-4">
            {/* Active reservations */}
            {activeReservations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Activas</h3>
                {activeReservations.map((res) => (
                  <Card key={res.id} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{res.itemName}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatShortDate(res.date)}</span>
                            <Clock className="w-3 h-3 ml-1" />
                            <span>{res.startTime} - {res.endTime}</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReturn(res)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Devolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Past reservations */}
            {pastReservations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Historial</h3>
                {pastReservations.map((res) => (
                  <Card key={res.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-muted-foreground">{res.itemName}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatShortDate(res.date)}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">Devuelto</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {reservations.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tenés reservas</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => {
                    const tabsTrigger = document.querySelector('[data-state="inactive"][value="stock"]') as HTMLButtonElement
                    tabsTrigger?.click()
                  }}
                >
                  Ver stock disponible
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info card */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2">Información importante</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Devolvé los items al finalizar tu reserva</li>
              <li>• Si no devolvés, el item seguirá no disponible</li>
              <li>• Cuidá los materiales del club</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Reserve Drawer */}
      <Drawer open={showReserveDrawer} onOpenChange={setShowReserveDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Reservar item</DrawerTitle>
            <DrawerDescription>
              {selectedItem?.name} - {selectedItem?.category}
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

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>El item quedará reservado a tu nombre hasta que lo marques como devuelto.</p>
            </div>
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

      {/* Return Confirmation Dialog */}
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
