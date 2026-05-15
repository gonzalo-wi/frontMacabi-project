import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { RequireAdmin } from '@/auth/RequireAdmin'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import AdminProyectoLayout from '@/pages/admin/proyectos/AdminProyectoLayout'
import ProyectoResumenPage from '@/pages/admin/proyectos/ProyectoResumenPage'
import ProyectoMiembrosPage from '@/pages/admin/proyectos/ProyectoMiembrosPage'
import ProyectoGastosPage from '@/pages/admin/proyectos/ProyectoGastosPage'
import ProyectoJornadasPage from '@/pages/admin/proyectos/ProyectoJornadasPage'
import LoginPage from '@/pages/LoginPage'
import RecuperarPasswordPage from '@/pages/RecuperarPasswordPage'
import RestablecerContrasenaPage from '@/pages/RestablecerContrasenaPage'
import AceptarInvitacionPage from '@/pages/AceptarInvitacionPage'
import PanelPage from '@/pages/PanelPage'
import AdminUsuariosPage from '@/pages/AdminUsuariosPage'
import AdminJornadasPage from '@/pages/AdminJornadasPage'
import AdminJornadaDetailPage from '@/pages/AdminJornadaDetailPage'
import AdminJornadaBuilderPage from '@/pages/AdminJornadaBuilderPage'
import AdminProyectosPage from '@/pages/AdminProyectosPage'
import AdminStockPage from '@/pages/AdminStockPage'
import EventRespondPage from '@/pages/EventRespondPage'

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
          { path: 'mis-jornadas', element: <Navigate to="/app" replace /> },
          { path: 'jornadas/:id/responder', element: <EventRespondPage /> },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              { index: true, element: <Navigate to="jornadas" replace /> },
              { path: 'jornadas', element: <AdminJornadasPage /> },
              { path: 'jornadas/:id', element: <AdminJornadaDetailPage /> },
              { path: 'jornadas/:id/editar', element: <AdminJornadaBuilderPage /> },
              { path: 'proyectos', element: <AdminProyectosPage /> },
              {
                path: 'proyectos/:id',
                element: <AdminProyectoLayout />,
                children: [
                  { index: true, element: <Navigate to="resumen" replace /> },
                  { path: 'resumen', element: <ProyectoResumenPage /> },
                  { path: 'miembros', element: <ProyectoMiembrosPage /> },
                  { path: 'gastos', element: <ProyectoGastosPage /> },
                  { path: 'jornadas', element: <ProyectoJornadasPage /> },
                ],
              },
              { path: 'usuarios', element: <AdminUsuariosPage /> },
              { path: 'stock', element: <AdminStockPage /> },
            ],
          },
        ],
      },
    ],
  },
])
