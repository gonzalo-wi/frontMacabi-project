import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import LoginPage from '@/pages/LoginPage'
import RecuperarPasswordPage from '@/pages/RecuperarPasswordPage'
import PanelPage from '@/pages/PanelPage'
import MicrosPage from '@/pages/MicrosPage'
import ComidasPage from '@/pages/ComidasPage'
import ReembolsosPage from '@/pages/ReembolsosPage'
import ReservasPage from '@/pages/ReservasPage'

//Vistas admin
import AdminComidasPage from '@/pages/AdminComidasPage'
import AdminMicrosPage from '@/pages/AdminMicrosPage'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/recuperar-password', element: <RecuperarPasswordPage /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          { index: true, element: <PanelPage /> },
          { path: 'micros', element: <MicrosPage /> },
          { path: 'comidas', element: <ComidasPage /> },
          { path: 'reembolsos', element: <ReembolsosPage /> },
          { path: 'reservas', element: <ReservasPage /> },
          // ── Vistas admin ──────────────────────────────────
          // Solo accesibles para rol admin y superadmin.
          { path: 'admin/comidas', element: <AdminComidasPage /> },
          { path: 'admin/micros',  element: <AdminMicrosPage /> },
        ],
      },
    ],
  },
])
