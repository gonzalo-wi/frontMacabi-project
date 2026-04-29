import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import LoginPage from '@/pages/LoginPage'
import RecuperarPasswordPage from '@/pages/RecuperarPasswordPage'
import RestablecerContrasenaPage from '@/pages/RestablecerContrasenaPage'
import RegisterPage from '@/pages/RegisterPage'
import PanelPage from '@/pages/PanelPage'
import ComidasPage from '@/pages/ComidasPage'
import AdminComidasPage from '@/pages/AdminComidasPage'
import AdminUsuariosPage from '@/pages/AdminUsuariosPage'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/recuperar-password', element: <RecuperarPasswordPage /> },
  { path: '/restablecer-contrasena', element: <RestablecerContrasenaPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          { index: true, element: <PanelPage /> },
          { path: 'comidas', element: <ComidasPage /> },
          { path: 'admin/comidas',   element: <AdminComidasPage /> },
          { path: 'admin/usuarios',  element: <AdminUsuariosPage /> },
        ],
      },
    ],
  },
])
