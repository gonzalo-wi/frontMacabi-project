import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { RequireAdmin } from '@/auth/RequireAdmin'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import ProyectoLayout from '@/features/projects/layouts/ProyectoLayout'
import ProyectoResumenPage from '@/pages/admin/AdminProyectoDetalle/ProyectoResumenPage'
import ProyectoMiembrosPage from '@/pages/admin/AdminProyectoDetalle/ProyectoMiembrosPage'
import ProyectoGastosPage from '@/pages/admin/AdminProyectoDetalle/ProyectoGastosPage'
import ProyectoJornadasPage from '@/pages/admin/AdminProyectoDetalle/ProyectoJornadasPage'
import ProyectoRecursosPage from '@/pages/admin/AdminProyectoDetalle/ProyectoRecursosPage'
import LoginPage from '@/pages/auth/LoginPage'
import RecuperarPasswordPage from '@/pages/auth/RecuperarPasswordPage'
import RestablecerContrasenaPage from '@/pages/auth/RestablecerContrasenaPage'
import AceptarInvitacionPage from '@/pages/auth/AceptarInvitacionPage'
import PanelPage from '@/pages/app/PanelPage'
import EventRespondPage from '@/pages/app/EventRespondPage'
import NoticiasPage from '@/pages/app/NoticiasPage'
import NoticiaDetailPage from '@/pages/app/NoticiaDetailPage'
import MisGastosPage from '@/pages/app/MisGastosPage'
import MisMaterialesPage from '@/pages/app/MisMaterialesPage'
import ExpenseDetailPage from '@/pages/app/ExpenseDetailPage'
import StockRequestDetailPage from '@/pages/app/StockRequestDetailPage'
import AdminUsuariosPage from '@/pages/admin/AdminUsuariosPage'
import AdminJornadasPage from '@/pages/admin/AdminJornadasPage'
import AdminJornadaDetailPage from '@/pages/admin/AdminJornadaDetailPage'
import AdminJornadaBuilderPage from '@/pages/admin/AdminJornadaBuilderPage'
import AdminProyectosPage from '@/pages/admin/AdminProyectosPage'
import AdminGastosPage from '@/pages/admin/AdminGastosPage'
import AdminStockPage from '@/pages/admin/AdminStockPage'
import AdminNoticiasPage from '@/pages/admin/AdminNoticiasPage'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/recuperar-password', element: <RecuperarPasswordPage /> },
  { path: '/restablecer-contrasena', element: <RestablecerContrasenaPage /> },
  { path: '/aceptar-invitacion', element: <AceptarInvitacionPage /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          { index: true, element: <PanelPage /> },
          { path: 'noticias', element: <NoticiasPage /> },
          { path: 'noticias/:id', element: <NoticiaDetailPage /> },
          { path: 'jornadas/:id/responder', element: <EventRespondPage /> },
          { path: 'stock', element: <MisMaterialesPage /> },
          { path: 'stock/requests/:id', element: <StockRequestDetailPage /> },
          { path: 'gastos', element: <MisGastosPage /> },
          { path: 'gastos/:id', element: <ExpenseDetailPage /> },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              { index: true, element: <Navigate to="jornadas" replace /> },
              { path: 'noticias', element: <AdminNoticiasPage /> },
              { path: 'jornadas', element: <AdminJornadasPage /> },
              { path: 'jornadas/:id', element: <AdminJornadaDetailPage /> },
              { path: 'jornadas/:id/editar', element: <AdminJornadaBuilderPage /> },
              { path: 'gastos', element: <AdminGastosPage /> },
              { path: 'gastos/:id', element: <ExpenseDetailPage /> },
              { path: 'proyectos', element: <AdminProyectosPage /> },
              {
                path: 'proyectos/:id',
                element: <ProyectoLayout />,
                children: [
                  { index: true, element: <Navigate to="resumen" replace /> },
                  { path: 'resumen', element: <ProyectoResumenPage /> },
                  { path: 'miembros', element: <ProyectoMiembrosPage /> },
                  { path: 'gastos', element: <ProyectoGastosPage /> },
                  { path: 'jornadas', element: <ProyectoJornadasPage /> },
                  { path: 'recursos', element: <ProyectoRecursosPage /> },
                ],
              },
              { path: 'usuarios', element: <AdminUsuariosPage /> },
              { path: 'stock', element: <AdminStockPage /> },
              { path: 'stock/requests/:id', element: <StockRequestDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
])
