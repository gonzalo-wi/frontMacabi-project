import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import LoginPage from '@/pages/LoginPage'
import RecuperarPasswordPage from '@/pages/RecuperarPasswordPage'
import RestablecerContrasenaPage from '@/pages/RestablecerContrasenaPage'
import AceptarInvitacionPage from '@/pages/AceptarInvitacionPage'
import PanelPage from '@/pages/PanelPage'
import ComidasPage from '@/pages/ComidasPage'
import MicrosPage from '@/pages/MicrosPage'
import ReservasPage from '@/pages/ReservasPage'
import ReembolsosPage from '@/pages/ReembolsosPage'
import AdminComidasPage from '@/pages/AdminComidasPage'
import AdminMicrosPage from '@/pages/AdminMicrosPage'
import AdminProyectosPage from '@/pages/AdminProyectosPage'
import AdminUsuariosPage from '@/pages/AdminUsuariosPage'
import ProyectosUsuarioPage from '@/pages/ProyectosUsuarioPage'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/recuperar-password', element: <RecuperarPasswordPage /> },
  { path: '/restablecer-contrasena', element: <RestablecerContrasenaPage /> },
  { path: '/aceptar-invitacion', element: <AceptarInvitacionPage /> },
  { path: '/register', element: <Navigate to="/" replace /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          { index: true, element: <PanelPage /> },
          { path: 'comidas', element: <ProyectosUsuarioPage /> },
          { path: 'comidas/:projectId', element: <ComidasPage /> },
          { path: 'micros', element: <MicrosPage /> },
          { path: 'reservas', element: <ReservasPage /> },
          { path: 'reembolsos', element: <ReembolsosPage /> },
          { path: 'admin/proyectos', element: <AdminProyectosPage /> },
          { path: 'admin/proyectos/:projectId/comidas', element: <AdminComidasPage /> },
          { path: 'admin/comidas', element: <Navigate to="/app/admin/proyectos" replace /> },
          { path: 'admin/micros', element: <AdminMicrosPage /> },
          { path: 'admin/usuarios', element: <AdminUsuariosPage /> },
        ],
      },
    ],
  },
])
