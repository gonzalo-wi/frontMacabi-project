# Guía completa del frontend — Macabi Madrijim

Documento de referencia del SPA en `frontend/`. Describe stack, arquitectura, carpetas, rutas, flujos de datos y convenciones para trabajar y extender el código.

---

## 1. Qué es este proyecto

Aplicación web para **madrijim y coordinadores** de Macabi Argentina: panel personal, gastos, pedidos de materiales, jornadas (eventos con respuestas modulares) y un **área admin** para gestionar usuarios, proyectos, stock e inventario.

| Aspecto | Detalle |
|---------|---------|
| Tipo | SPA (Single Page Application) |
| Backend | API REST Go (fuera de esta carpeta); el front solo consume `/api/...` |
| Idioma UI | Español (Argentina), fechas y moneda `es-AR` |
| Gestor de paquetes | **pnpm** (no usar `npm install` en este repo) |
| Alias de imports | `@/` → `src/` |

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| UI | React 19 |
| Lenguaje | TypeScript |
| Build / dev | Vite 8 |
| Estilos | Tailwind CSS v4 + tokens CSS en `index.css` |
| Componentes base | **shadcn/ui** (Radix UI + utilidades) en `components/ui/` |
| Routing | React Router 7 (`createBrowserRouter`) |
| Server state | TanStack Query v5 |
| Toasts | Sonner |
| Iconos | Lucide React |
| Gráficos | Recharts (analytics de gastos) |
| Excel export | xlsx |
| PWA | vite-plugin-pwa + Workbox (`src/sw.ts`) |
| Push | Web Push API + service worker |

---

## 3. Arranque de la aplicación

```
index.html
  └── main.tsx
        ├── import './index.css'          (Tailwind + design tokens)
        ├── AppProviders
        │     ├── QueryClientProvider     (staleTime 30s, retry 1)
        │     ├── AuthProvider            (sesión en localStorage)
        │     ├── Toaster (sonner)
        │     └── ReactQueryDevtools (solo DEV)
        └── RouterProvider(router)
```

En **desarrollo**, `main.tsx` desregistra service workers viejos para no romper HMR.

---

## 4. Variables de entorno

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `VITE_API_URL` | Sí | Origen del backend (sin `/api` duplicado; se normaliza en `config/env.ts`) |

Archivos típicos:

- `.env.development` — backend local (`http://localhost:8081`)
- `.env.production` — URL de producción
- `.env.example` — plantilla documentada

Si falta `VITE_API_URL`, la app **falla al importar** `config/env.ts`.

---

## 5. Árbol de carpetas (`src/`)

```
src/
├── main.tsx                 # Entry point
├── router.tsx               # Definición de todas las rutas
├── index.css                # Tailwind + theme tokens (light/dark)
├── sw.ts                    # Service worker (PWA + push)
│
├── config/
│   └── env.ts               # VITE_API_URL → apiBaseUrl
│
├── providers/
│   └── AppProviders.tsx     # Query + Auth + Toaster
│
├── contexts/
│   └── AuthContext.tsx      # Sesión, bootstrap, push subscribe
│
├── auth/
│   ├── RequireAuth.tsx      # Guard: redirige a / si no hay sesión
│   └── RequireAdmin.tsx     # Guard: role === 'admin'
│
├── hooks/                   # Hooks genéricos (sin dominio de negocio)
│   ├── useAuth.ts           # Re-export de AuthContext
│   ├── useIsMobile.ts
│   ├── useSearchParamState.ts
│   ├── useDebouncedValue.ts
│   ├── useClientPagination.ts
│   └── useFilteredClientList.ts
│
├── lib/                     # Utilidades transversales
│   ├── api/
│   │   ├── apiClient.ts     # fetch JSON + multipart
│   │   ├── auth.ts          # login, getMe, reset password, etc.
│   │   ├── types.ts         # UserDTO, auth bodies (cross-domain)
│   │   └── fetchAllPages.ts
│   ├── queryKeys.ts         # Claves centralizadas TanStack Query
│   ├── pullRefreshRoots.ts  # Qué invalidar al pull-to-refresh
│   ├── currency.ts          # ARS display ↔ canonical
│   ├── date.ts / datePresets.ts
│   ├── pagination.ts
│   └── utils.ts             # cn(), getInitials()
│
├── layouts/                 # Marcos de RUTA (React Router + Outlet)
│   ├── AppShellLayout/      # Sidebar, mobile nav, pull refresh
│   ├── AuthPageLayout.tsx   # Hero + form (recuperar, invitación)
│   └── auth/
│       ├── AuthLayoutParts.tsx
│       ├── LoginBrandingPanel.tsx
│       └── LoginPageLayout.tsx
│
├── pages/                   # Una URL = un archivo *Page.tsx
│   ├── auth/                # 4 páginas públicas
│   ├── app/                 # 6 páginas participante
│   └── admin/               # 8 páginas admin + AdminProyectoDetalle/
│
├── components/              # UI compartida sin dominio único
│   ├── ui/                  # shadcn (Button, Dialog, Card…)
│   ├── data/                # Tablas, listas, KPIs, paginación
│   ├── PageHeader.tsx
│   ├── FormField.tsx
│   ├── ConfirmDialog.tsx
│   ├── ActionButton.tsx
│   ├── PullToRefresh.tsx
│   └── …
│
└── features/                # Lógica por dominio de negocio
    ├── README.md
    ├── dashboard/           # Panel participante (composición)
    ├── projects/
    ├── expenses/
    ├── stock/
    ├── events/
    ├── users/
    ├── notifications/
    └── push/
```

---

## 6. Capas y responsabilidades

### Regla de oro

```
¿Es una URL?                    → pages/*Page.tsx
¿Envuelve rutas (Outlet)?      → layouts/
¿Es primitivo shadcn?           → components/ui/
¿Es patrón de listado/KPI?     → components/data/
¿Es UI compartida genérica?     → components/*.tsx sueltos
¿Habla de gastos/proyectos/…?   → features/<dominio>/
¿Hook/util sin dominio?         → hooks/ o lib/
```

### `pages/` — cascarones de ruta

- **Finas**: ensamblan `PageHeader`, hooks (`useAdminGastosPage`, etc.) y componentes de `features/`.
- **Un archivo por pantalla**: `AdminGastosPage.tsx`, no `AdminGastosPage/index.tsx`.
- Excepción de agrupación: `pages/admin/AdminProyectoDetalle/` (5 tabs del mismo proyecto).

### `features/` — dominio

Cada feature suele tener:

| Subcarpeta | Contenido |
|----------|-----------|
| `api/` | Funciones que llaman a `apiRequest` / `apiMultipart` |
| `model/types.ts` | DTOs alineados al backend |
| `hooks/` | Queries, mutations, estado de pantalla (`useXPage`) |
| `components/` | UI específica del dominio |
| `lib/` | Helpers, labels, status, métricas |
| `layouts/` | Solo si aplica (ej. `ProyectoLayout`) |

Mini-feature **`dashboard/`**: composición del panel (`usePanelPage`, `greeting.ts`); no tiene API propia.

### `components/ui/` vs `components/data/` vs sueltos

| Carpeta | Origen | Ejemplos |
|---------|--------|----------|
| `ui/` | **shadcn CLI** | `button`, `dialog`, `card`, `tabs` |
| `data/` | **Código propio** — pantallas con colecciones | `SortableTable`, `MobileList`, `DataToolbar`, `MetricCard`, `PaginationControls` |
| Sueltos | **Código propio** — forms, shell, acciones | `PageHeader`, `FormField`, `ConfirmDialog`, `PullToRefresh` |

No confundir `layouts/` (rutas) con poner cosas en `components/layout/`.

---

## 7. Routing completo

Definido en [`src/router.tsx`](../src/router.tsx).

### Rutas públicas (sin sesión)

| Path | Page |
|------|------|
| `/` | `LoginPage` |
| `/recuperar-password` | `RecuperarPasswordPage` |
| `/restablecer-contrasena` | `RestablecerContrasenaPage` |
| `/aceptar-invitacion` | `AceptarInvitacionPage` |

### Rutas autenticadas (`RequireAuth` → `AppShellLayout`)

| Path | Page | Rol |
|------|------|-----|
| `/app` | `PanelPage` | Todos |
| `/app/jornadas/:id/responder` | `EventRespondPage` | Participante |
| `/app/stock` | `MisMaterialesPage` | Participante |
| `/app/stock/requests/:id` | `StockRequestDetailPage` | Participante / admin |
| `/app/gastos` | `MisGastosPage` | Participante |
| `/app/gastos/:id` | `ExpenseDetailPage` | Participante / admin |

### Admin (`RequireAdmin` bajo `/app/admin`)

| Path | Page |
|------|------|
| `/app/admin` | redirect → `jornadas` |
| `/app/admin/jornadas` | `AdminJornadasPage` |
| `/app/admin/jornadas/:id` | `AdminJornadaDetailPage` |
| `/app/admin/jornadas/:id/editar` | `AdminJornadaBuilderPage` |
| `/app/admin/gastos` | `AdminGastosPage` |
| `/app/admin/gastos/:id` | `ExpenseDetailPage` |
| `/app/admin/proyectos` | `AdminProyectosPage` |
| `/app/admin/proyectos/:id/*` | `ProyectoLayout` + tabs |
| `/app/admin/usuarios` | `AdminUsuariosPage` |
| `/app/admin/stock` | `AdminStockPage` |
| `/app/admin/stock/requests/:id` | `StockRequestDetailPage` |

### Tabs de proyecto (`ProyectoLayout`)

| Path suffix | Page |
|-------------|------|
| `resumen` | `ProyectoResumenPage` |
| `miembros` | `ProyectoMiembrosPage` |
| `recursos` | `ProyectoRecursosPage` (materiales) |
| `gastos` | `ProyectoGastosPage` |
| `jornadas` | `ProyectoJornadasPage` |

### Diagrama de anidación

```
/login, /recuperar-password, …
/app  → RequireAuth
  └── AppShellLayout
        ├── /app                          PanelPage
        ├── /app/gastos, stock, jornadas…
        └── /app/admin → RequireAdmin
              ├── jornadas, gastos, usuarios, stock, proyectos
              └── proyectos/:id → ProyectoLayout
                    └── resumen | miembros | recursos | gastos | jornadas
```

**Producción:** el servidor debe hacer fallback de todas las rutas a `index.html` (SPA).

---

## 8. Autenticación y roles

### Flujo de sesión

1. Login → `POST /api/auth/login` → `setSession(token, user)`.
2. Sesión persistida en `localStorage` (`macabi_auth`).
3. Al cargar la app: lee storage → `getMe(token)` → actualiza user o limpia sesión inválida.
4. Logout → limpia storage + `unsubscribeFromPush`.

### Roles

| Rol | `user.role` | Acceso |
|-----|-------------|--------|
| Admin global | `admin` | `/app/admin/*` + todo lo demás |
| Usuario | `user` | `/app/*` participante |

### Rol en proyecto (distinto del rol global)

- `coordinator` / `madrij` en membresía de proyecto.
- `useProjectRole(projectId)` → `canManage` = admin global **o** coordinador del proyecto.
- Afecta aprobación de gastos, vistas de proyecto en participante, etc.

### Guards

- `RequireAuth`: spinner mientras `isRestoring`; redirect a `/` si no autenticado.
- `RequireAdmin`: redirect a `/app` si `user.role !== 'admin'`.

---

## 9. Comunicación con el backend

### Cliente HTTP

[`lib/api/apiClient.ts`](../src/lib/api/apiClient.ts):

- `apiRequest<T>(path, { method, body, token })` — JSON, header `Authorization: Bearer`.
- `apiMultipart<T>(path, formData, token)` — uploads (comprobantes, etc.).
- Errores → `ApiError` con `status` y mensaje del campo `error` del JSON.

Paths siempre tipo `/api/...`; la base viene de `apiBaseUrl`.

### APIs por feature

| Feature | Archivo principal |
|---------|-------------------|
| Auth (global) | `lib/api/auth.ts` |
| Users | `features/users/api/usersApi.ts` |
| Projects | `features/projects/api/projectsApi.ts` |
| Expenses | `features/expenses/api/expensesApi.ts` |
| Stock | `features/stock/api/stockApi.ts`, `requestsApi.ts` |
| Events | `features/events/api/eventsApi.ts` |
| Push | `features/push/api/pushApi.ts` |
| Notifications | `features/*/api/notificationsApi.ts` (por dominio) |

### TanStack Query

- Claves centralizadas en [`lib/queryKeys.ts`](../src/lib/queryKeys.ts).
- Patrón: `xxxRoot()` para invalidar familias + `xxx(...params)` para queries concretas.
- Default: `staleTime: 30_000`, `retry: 1`.

### Invalidación y refresh

- Mutations suelen llamar `queryClient.invalidateQueries({ queryKey: ...Root() })`.
- **Pull-to-refresh** (mobile): `getPullRefreshRoots(pathname)` invalida roots según la ruta actual.

---

## 10. Layouts (marcos de ruta)

| Layout | Ubicación | Función |
|--------|-----------|---------|
| `AppShellLayout` | `layouts/AppShellLayout/` | Sidebar desktop, bottom nav mobile, drawer “Más”, cambio de contraseña, campana de notificaciones vía `PageHeader`, pull-to-refresh en `<main>` |
| `AuthPageLayout` | `layouts/AuthPageLayout.tsx` | Dos columnas hero + form (recuperar, invitación, reset) |
| `LoginPageLayout` | `layouts/auth/LoginPageLayout.tsx` | Login con branding propio y sheet mobile |
| `ProyectoLayout` | `features/projects/layouts/ProyectoLayout.tsx` | Header del proyecto + tabs + `<Outlet />` |

Nav items: [`layouts/AppShellLayout/navItems.ts`](../src/layouts/AppShellLayout/navItems.ts).

---

## 11. Catálogo de páginas

### Auth (`pages/auth/`)

| Archivo | Propósito |
|---------|-----------|
| `LoginPage` | Login; redirect si ya autenticado |
| `RecuperarPasswordPage` | Solicitar email de reset |
| `RestablecerContrasenaPage` | Nueva contraseña con token |
| `AceptarInvitacionPage` | Alta con invitación |

### Participante (`pages/app/`)

| Archivo | Propósito |
|---------|-----------|
| `PanelPage` | Inicio: proyectos + próximas jornadas |
| `MisGastosPage` | Mis gastos / gastos del proyecto (tabs + filtros URL) |
| `MisMaterialesPage` | Pedidos de materiales (scope similar) |
| `ExpenseDetailPage` | Detalle, aprobar/rechazar, comprobante |
| `StockRequestDetailPage` | Detalle de pedido de stock |
| `EventRespondPage` | Responder módulos de una jornada |

### Admin (`pages/admin/`)

| Archivo | Propósito |
|---------|-----------|
| `AdminJornadasPage` | Listado de jornadas |
| `AdminJornadaDetailPage` | Detalle, participantes, resultados |
| `AdminJornadaBuilderPage` | Editor de módulos |
| `AdminGastosPage` | Listado global, analytics, export |
| `AdminProyectosPage` | CRUD proyectos |
| `AdminUsuariosPage` | Usuarios, invitaciones, drawer |
| `AdminStockPage` | Inventario + pedidos admin |

### Detalle proyecto (`pages/admin/AdminProyectoDetalle/`)

| Archivo | Propósito |
|---------|-----------|
| `ProyectoResumenPage` | Nombre, descripción (`ProjectMetaForm`) |
| `ProyectoMiembrosPage` | Agregar/quitar miembros |
| `ProyectoRecursosPage` | Panel stock del proyecto |
| `ProyectoGastosPage` | Panel gastos del proyecto |
| `ProyectoJornadasPage` | Jornadas vinculadas |

---

## 12. Features por dominio

### `projects`

- API: list/create/patch/delete proyectos, miembros.
- Hooks: `useProject`, `useMyProjectMemberships`, `useAdminProyectosPage`, `useProyectoMiembrosPage`, `useProjectScope`, `useProjectRole`.
- UI: `ProjectMetaForm`, `ProjectScopeTabs`, `AgregarMiembroCard`, `UserPanelProjectsBlock`, admin list/dialogs.
- Layout: `ProyectoLayout`.

### `expenses`

- API: CRUD gastos, comprobantes multipart, analytics, categorías, export.
- Validación comprobante: `validateReceiptFile` (2 MB, JPG/PNG/WebP/PDF) — front al elegir archivo + backend autoritativo.
- Hooks: `useAdminGastosPage`, `useExpenseDetailPage`, `useExpenseCategories`.
- UI: formularios, listas, `ExpenseStatusMetricsGrid`, `PeriodFilter`, panels de proyecto, analytics Recharts.

### `stock`

- API: recursos, pedidos, transiciones de estado.
- Hooks: `useAdminStock`, `useProjectStockRequests`, `useStockRequestTransitions`.
- UI: `StockRequestsList`, `CreateRequestDialog`, panels admin/participante.

### `events` (jornadas)

- API: instancias, módulos, respuestas, duplicar jornada.
- Hooks: `useAdminJornadas`, `useAdminJornadaDetailPage`, `useEventRespondPage`, `useUserRelevantUpcomingEvents`.
- UI: builder de módulos, `ResponseModuleCard`, badges de deadline/estado.

### `users`

- API: listado admin (`GET /api/users?q=`), invitaciones, bulk invite, patch rol/estado.
- Hooks: `useAdminUsuariosPage` (tabla paginada), `useAdminUsers` + `fetchAllUsersForAdmin` (pickers), `useAdminUserDrawer`, `useAdminUserMutations`, `useBulkInviteFlow`.
- UI: `UsersTable`, `InviteDialog`, `BulkInviteDialog`, drawer.

### `notifications`

- Campana en `PageHeader`; paneles por tipo (stock, gastos, eventos).
- APIs de unread/list por dominio.

### `push`

- Suscripción al login; `pushApi` + `pushSubscription.ts`.
- Service worker muestra notificaciones y abre URL.

### `dashboard`

- `usePanelPage` + `greeting.ts` para el panel participante.

---

## 13. Patrones de UI recurrentes

### Listados admin (paginación server-side)

Patrón unificado en usuarios, jornadas, proyectos, stock y gastos:

1. Estado local: `search`, `page`, filtros opcionales (`status`, proyecto…).
2. `useDebouncedValue(search.trim())` (~300 ms) antes de armar la query.
3. `resetKey` (búsqueda + filtros) → volver a página 1 sin `useEffect`.
4. `useQuery` con `PAGE_SIZE` y params `q` / `status` en el API.
5. UI: `DataToolbar` + tabla/lista + `PaginationControls`.

Ejemplos: `useAdminUsuariosPage`, `useAdminJornadasPage`, `useAdminProyectosPage`, `useAdminStockPage`, `useAdminGastosPage`.

**Excepción:** `fetchAllUsersForAdmin` + `useAdminUsers` siguen trayendo **todos** los usuarios solo para pickers (coordinador, miembros, participantes), no para la tabla admin.

### Listados participante con tabs “Mis X / Del proyecto”

1. `useScopedParticipantListPage` + `ProjectScopeTabs`.
2. Filtros en query string: `?tab=`, `project=`, `estado=`, `q=`.
3. Ejemplo: `MisGastosPage`, `MisMaterialesPage`.

### Formularios

- `FormField` (label + hint + control).
- `ExpenseFormDialog` / `EditExpenseDialog` comparten `ExpenseFormFields`.
- Montos: `formatArsInput` / `arsToCanonical` / `formatARS`.

### Confirmaciones destructivas

- `ConfirmDialog` sobre `AlertDialog` de shadcn.

### Métricas de gastos

- `MetricCard` + `ExpenseStatusMetricsGrid` + `metricsFromAnalytics`.

---

## 14. Hooks genéricos (`hooks/`)

| Hook | Uso |
|------|-----|
| `useSearchParamState` | Sync estado con URL (`?q=`, filtros) |
| `useDebouncedValue` | Retrasa un valor antes de consultar al API (búsquedas admin) |
| `useClientPagination` | Paginar array ya filtrado |
| `useFilteredClientList` | Filtros proyecto/estado/búsqueda + paginación client |
| `useIsMobile` / `useIsDesktop` | Breakpoints (mobile nav, drawer vs dialog) |

---

## 15. Utilidades (`lib/`)

| Módulo | Función |
|--------|---------|
| `currency.ts` | ARS: input con coma, canonical para API |
| `date.ts` | Formateo fechas |
| `datePresets.ts` | Rangos “Este mes”, “Últimos 6 meses” para gastos |
| `pagination.ts` | `PAGE_SIZE` constante |
| `utils.ts` | `cn()` (tailwind-merge), `getInitials()` |
| `fetchAllPages.ts` | Helper para traer todas las páginas (pickers, mapas; no listados admin) |

---

## 16. Estilos y theming

- **Tailwind v4** vía `@import 'tailwindcss'` en `index.css`.
- Tokens en `:root` y `.dark` (oklch): primary navy Macabi, sidebar oscuro incluso en light mode.
- Clases utilitarias custom: `shadow-premium`, `safe-area-top`, animaciones (`tw-animate-css`).
- Componentes shadcn usan variables `--primary`, `--muted`, etc.

---

## 17. PWA y offline

- Manifest: nombre “Macabi Madrijim”, standalone, icono `logo_macabi.png`.
- `sw.ts`: precache assets estáticos; **API siempre NetworkOnly**; navegación SPA → `index.html`.
- Push: eventos `push` y `notificationclick` en el SW.
- Dev: SW puede estar activo (`devOptions.enabled`); main desregistra en DEV para HMR limpio.

---

## 18. Mobile UX

- **Bottom nav** (`MobileNav`) + drawer “Más” con links admin si `role === admin`.
- **Pull-to-refresh** en main (solo mobile, no con drawer/dialog abierto).
- Tablas → **`MobileList`** en paralelo a `SortableTable`.
- Headers sticky; tabs de proyecto con scroll horizontal sin comprimir labels.

---

## 19. Cómo agregar una feature nueva (checklist)

1. **Backend** expone endpoints → tipos en `features/<x>/model/types.ts`.
2. **API** en `features/<x>/api/`.
3. **queryKeys** en `lib/queryKeys.ts` (+ entrada en `pullRefreshRoots` si aplica).
4. **Hook** `useXPage` si la pantalla tiene estado non-trivial.
5. **Componentes** en `features/<x>/components/`.
6. **Page** fina en `pages/.../XPage.tsx`.
7. **Ruta** en `router.tsx` + guard si es admin.
8. **Nav** en `navItems.ts` si debe aparecer en sidebar.

---

## 20. Estado del refactor / deuda menor

- Algunas pages aún “gordas” (`MisGastosPage`, `ExpenseDetailPage`, `AdminJornadaBuilderPage`, etc.) — lógica mezclada en la page; el patrón objetivo es el de `AdminUsuariosPage` / `AdminGastosPage`.
- `AuthPageLayout.tsx` está en `layouts/` raíz; piezas auth en `layouts/auth/` (mover opcional).
- `components/data/` vs sueltos en `components/` es agrupación temática, no capas distintas.
- `lib/api/types.ts` con `UserDTO` cruza dominios; el resto de tipos vive en cada feature.

---

## 21. Comandos útiles

```bash
pnpm install          # instalar deps
pnpm dev              # Vite dev server
pnpm build            # tsc + vite build
pnpm preview          # servir dist/
pnpm lint             # eslint
```

---

## 22. Referencias rápidas de archivos clave

| Necesitás… | Mirá… |
|------------|--------|
| Todas las rutas | `src/router.tsx` |
| Sesión | `src/contexts/AuthContext.tsx` |
| HTTP | `src/lib/api/apiClient.ts` |
| Cache keys | `src/lib/queryKeys.ts` |
| Shell logueado | `src/layouts/AppShellLayout/index.tsx` |
| Convención features | `src/features/README.md` |
| Env | `src/config/env.ts`, `.env.example` |

---

*Última actualización: refleja estructura post-refactor (pages planas, features con hooks, ProyectoLayout en features, LoginPageLayout, dashboard feature).*
