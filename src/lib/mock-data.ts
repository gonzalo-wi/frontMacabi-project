// Mock data for the Macabi Madrijim app

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'coordinator' | 'madrij'
  project?: string
  avatar?: string
}

export interface Micro {
  id: string
  date: string
  departureTime: string
  returnTime: string
  totalSeats: number
  reservedSeats: number
  reservationDeadline: string
  userReserved: boolean
  destination: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  type: 'main' | 'vegetarian' | 'vegan' | 'light'
  icon: string
}

export interface Meal {
  id: string
  date: string
  type: 'lunch' | 'dinner'
  menu: MenuItem[]
  confirmationDeadline: string
  userAttending: boolean | null
  userSelection: string | null
}

export interface Expense {
  id: string
  amount: number
  description: string
  date: string
  attachmentUrl: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  userId: string
  userName: string
}

export interface InventoryItem {
  id: string
  name: string
  description: string
  category: string
  available: boolean
  currentReservation?: {
    userId: string
    userName: string
    date: string
    startTime: string
    endTime: string
  }
  imageUrl?: string
}

export interface Reservation {
  id: string
  itemId: string
  itemName: string
  userId: string
  userName: string
  date: string
  startTime: string
  endTime: string
  returned: boolean
}

export interface Notification {
  id: string
  type: 'micro' | 'meal' | 'expense' | 'reservation' | 'general'
  title: string
  message: string
  date: string
  read: boolean
  actionUrl?: string
}

// Current user
export const currentUser: User = {
  id: 'user-1',
  name: 'Daniel Cohen',
  email: 'daniel.cohen@macabi.org.ar',
  role: 'madrij',
  project: 'Tzofim',
}

// Micros data
export const micros: Micro[] = [
  {
    id: 'micro-1',
    date: '2026-04-25',
    departureTime: '08:30',
    returnTime: '18:00',
    totalSeats: 45,
    reservedSeats: 32,
    reservationDeadline: '2026-04-23T23:59:59',
    userReserved: false,
    destination: 'Campo Macabi - Ezeiza',
  },
  {
    id: 'micro-2',
    date: '2026-04-25',
    departureTime: '08:30',
    returnTime: '18:00',
    totalSeats: 45,
    reservedSeats: 41,
    reservationDeadline: '2026-04-23T23:59:59',
    userReserved: true,
    destination: 'Campo Macabi - Ezeiza',
  },
]

// Meals data
export const upcomingMeal: Meal = {
  id: 'meal-1',
  date: '2026-04-25',
  type: 'lunch',
  menu: [
    {
      id: 'menu-1',
      name: 'Milanesa con puré',
      description: 'Milanesa de ternera con puré de papas casero',
      type: 'main',
      icon: '🍖',
    },
    {
      id: 'menu-2',
      name: 'Pasta con salsa',
      description: 'Fideos con salsa bolognesa casera',
      type: 'main',
      icon: '🍝',
    },
    {
      id: 'menu-3',
      name: 'Ensalada completa',
      description: 'Mix de hojas verdes, tomate, zanahoria y huevo',
      type: 'vegetarian',
      icon: '🥗',
    },
    {
      id: 'menu-4',
      name: 'Hamburguesa vegana',
      description: 'Hamburguesa de lentejas con papas al horno',
      type: 'vegan',
      icon: '🌱',
    },
  ],
  confirmationDeadline: '2026-04-24T12:00:00',
  userAttending: null,
  userSelection: null,
}

// Expenses data
export const expenses: Expense[] = [
  {
    id: 'expense-1',
    amount: 15000,
    description: 'Materiales para manualidades - Cartulinas y pegamento',
    date: '2026-04-20',
    attachmentUrl: '/receipts/receipt-1.jpg',
    status: 'approved',
    userId: 'user-1',
    userName: 'Daniel Cohen',
  },
  {
    id: 'expense-2',
    amount: 8500,
    description: 'Snacks para actividad especial',
    date: '2026-04-18',
    attachmentUrl: '/receipts/receipt-2.jpg',
    status: 'pending',
    userId: 'user-1',
    userName: 'Daniel Cohen',
  },
  {
    id: 'expense-3',
    amount: 22000,
    description: 'Elementos deportivos - Pelotas y conos',
    date: '2026-04-15',
    attachmentUrl: '/receipts/receipt-3.jpg',
    status: 'rejected',
    rejectionReason: 'El monto excede el presupuesto asignado. Por favor dividir en dos compras.',
    userId: 'user-1',
    userName: 'Daniel Cohen',
  },
  {
    id: 'expense-4',
    amount: 5200,
    description: 'Impresiones de planificación',
    date: '2026-04-10',
    attachmentUrl: '/receipts/receipt-4.jpg',
    status: 'approved',
    userId: 'user-1',
    userName: 'Daniel Cohen',
  },
]

// Inventory items
export const inventoryItems: InventoryItem[] = [
  {
    id: 'item-1',
    name: 'Proyector Epson',
    description: 'Proyector HD con HDMI y VGA',
    category: 'Tecnología',
    available: true,
    imageUrl: '/inventory/projector.jpg',
  },
  {
    id: 'item-2',
    name: 'Parlante Bluetooth JBL',
    description: 'Parlante portátil con batería de 12 horas',
    category: 'Tecnología',
    available: false,
    currentReservation: {
      userId: 'user-2',
      userName: 'Sofia Levy',
      date: '2026-04-25',
      startTime: '09:00',
      endTime: '17:00',
    },
    imageUrl: '/inventory/speaker.jpg',
  },
  {
    id: 'item-3',
    name: 'Kit de arte (20 pinceles)',
    description: 'Set completo de pinceles de diferentes tamaños',
    category: 'Manualidades',
    available: true,
    imageUrl: '/inventory/art-kit.jpg',
  },
  {
    id: 'item-4',
    name: 'Juego de mesa gigante',
    description: 'Jenga gigante para exteriores',
    category: 'Juegos',
    available: true,
    imageUrl: '/inventory/jenga.jpg',
  },
  {
    id: 'item-5',
    name: 'Micrófono inalámbrico',
    description: 'Micrófono con receptor USB',
    category: 'Tecnología',
    available: false,
    currentReservation: {
      userId: 'user-3',
      userName: 'Marcos Goldstein',
      date: '2026-04-26',
      startTime: '10:00',
      endTime: '14:00',
    },
    imageUrl: '/inventory/microphone.jpg',
  },
  {
    id: 'item-6',
    name: 'Set de pelotas (10 unidades)',
    description: 'Pelotas de fútbol, vóley y básquet',
    category: 'Deportes',
    available: true,
    imageUrl: '/inventory/balls.jpg',
  },
]

// User reservations
export const userReservations: Reservation[] = [
  {
    id: 'res-1',
    itemId: 'item-1',
    itemName: 'Proyector Epson',
    userId: 'user-1',
    userName: 'Daniel Cohen',
    date: '2026-04-19',
    startTime: '14:00',
    endTime: '18:00',
    returned: true,
  },
  {
    id: 'res-2',
    itemId: 'item-3',
    itemName: 'Kit de arte (20 pinceles)',
    userId: 'user-1',
    userName: 'Daniel Cohen',
    date: '2026-04-26',
    startTime: '09:00',
    endTime: '13:00',
    returned: false,
  },
]

// Notifications
export const notifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'micro',
    title: '¡Reservá tu lugar en el micro!',
    message: 'Quedan 13 lugares disponibles para el sábado 25/04. Confirmá antes del jueves.',
    date: '2026-04-22T10:00:00',
    read: false,
    actionUrl: '/app/micros',
  },
  {
    id: 'notif-2',
    type: 'meal',
    title: 'Confirmá tu almuerzo',
    message: 'No te olvides de elegir tu comida para el próximo sábado.',
    date: '2026-04-22T09:00:00',
    read: false,
    actionUrl: '/app/comidas',
  },
  {
    id: 'notif-3',
    type: 'expense',
    title: 'Gasto aprobado',
    message: 'Tu gasto de $15.000 por materiales fue aprobado.',
    date: '2026-04-21T15:30:00',
    read: true,
    actionUrl: '/app/reembolsos',
  },
  {
    id: 'notif-4',
    type: 'reservation',
    title: 'Recordatorio de devolución',
    message: 'Recordá devolver el Kit de arte después del sábado 26/04.',
    date: '2026-04-21T12:00:00',
    read: true,
    actionUrl: '/app/reservas',
  },
]

// Helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Interpreta YYYY-MM-DD como calendario local (evita el desfase UTC de `new Date('YYYY-MM-DD')`). */
function parseCalendarDateInput(dateString: string): Date | null {
  const head = dateString.trim().slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(head)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d)
}

export function formatDate(dateString: string): string {
  const local = parseCalendarDateInput(dateString)
  const date = local ?? new Date(dateString)
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatShortDate(dateString: string): string {
  const local = parseCalendarDateInput(dateString)
  const date = local ?? new Date(dateString)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

export function getTimeRemaining(deadline: string): string {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()
  
  if (diff <= 0) return 'Tiempo agotado'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} día${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`
  }
  
  return `${hours} hora${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`
}

export function getStatusColor(status: Expense['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-success/10 text-success'
    case 'pending':
      return 'bg-warning/10 text-warning-foreground'
    case 'rejected':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function getStatusLabel(status: Expense['status']): string {
  switch (status) {
    case 'approved':
      return 'Aprobado'
    case 'pending':
      return 'Pendiente'
    case 'rejected':
      return 'Rechazado'
    default:
      return status
  }
}
