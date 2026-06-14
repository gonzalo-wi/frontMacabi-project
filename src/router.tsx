import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { RequireAdmin } from '@/auth/RequireAdmin'
import { AppShellLayout } from '@/layouts/AppShellLayout'
import ProyectoLayout from '@/pages/admin/AdminProyectoDetalle/ProyectoLayout'
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

function LegacyProjectRedirect({ to }: { to: '/app/gastos' | '/app/stock' }) {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `${to}?project=${id}` : to} replace />
}

function LegacyStockRequestRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `/app/stock/requests/${id}` : '/app/stock'} replace />
}

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
          { path: 'mis-proyectos', element: <Navigate to="/app/gastos" replace /> },
          { path: 'stock-catalogo', element: <Navigate to="/app/stock" replace /> },
          {
            path: 'mis-solicitudes-stock',
            element: <Navigate to="/app/stock" replace />,
          },
          { path: 'stock/catalogo', element: <Navigate to="/app/stock" replace /> },
          { path: 'stock/mis-pedidos', element: <Navigate to="/app/stock" replace /> },
          { path: 'gastos/mis-cargas', element: <Navigate to="/app/gastos" replace /> },
          { path: 'gastos/proyectos', element: <Navigate to="/app/gastos" replace /> },
          {
            path: 'stock',
            element: <MisMaterialesPage />,
          },
          {
            path: 'stock/requests/:id',
            element: <StockRequestDetailPage />,
          },
          {
            path: 'gastos',
            element: <MisGastosPage />,
          },
          {
            path: 'gastos/:id',
            element: <ExpenseDetailPage />,
          },
          { path: 'mis-proyectos/:id', element: <LegacyProjectRedirect to="/app/gastos" /> },
          { path: 'mis-proyectos/:id/gastos', element: <LegacyProjectRedirect to="/app/gastos" /> },
          { path: 'mis-proyectos/:id/recursos', element: <LegacyProjectRedirect to="/app/stock" /> },
          {
            path: 'mis-proyectos/:projectId/solicitudes-stock/:id',
            element: <LegacyStockRequestRedirect />,
          },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              { index: true, element: <Navigate to="jornadas" replace /> },
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
              { path: 'solicitudes', element: <Navigate to="/app/admin/stock?tab=pedidos" replace /> },
              { path: 'stock', element: <AdminStockPage /> },
              { path: 'stock/requests/:id', element: <StockRequestDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
])
