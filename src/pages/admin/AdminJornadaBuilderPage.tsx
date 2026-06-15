import { Link, useParams } from 'react-router-dom'
import { CalendarRange, Loader2 } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventModuleEditorCard } from '@/features/events/components/EventModuleEditorCard'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import { useJornadaBuilder } from '@/features/events/hooks/useJornadaBuilder'
import { labelInstanceStatus, labelInstanceType } from '@/features/events/lib/eventLabels'
import { moduleEditorResetKey } from '@/features/events/lib/moduleEditorKey'
import { ProjectPicker } from '@/features/projects/components/ProjectPicker'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

export default function AdminJornadaBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()

  const {
    detailQ,
    projectsQ,
    metaTitle,
    setMetaTitle,
    metaType,
    setMetaType,
    startsLocal,
    setStartsLocal,
    deadlineLocal,
    setDeadlineLocal,
    metaStatus,
    setMetaStatus,
    evProjects,
    setEvProjects,
    builderSection,
    setBuilderSection,
    globalSaving,
    registerModuleSaver,
    handleModuleDirtyChange,
    invalidateDetail,
    inst,
    metaDirty,
    projectsDirty,
    moduleDirtyCount,
    anythingDirty,
    addModule,
    delModule,
    addGroup,
    addOption,
    handleSaveAll,
    sortedModules,
    headerTitle,
    headerSubtitle,
    scrollToModule,
  } = useJornadaBuilder({ id, token, isRestoring })

  if (!id) return null

  return (
    <div className="min-h-screen pb-32">
      <PageHeader
        icon={CalendarRange}
        title={headerTitle}
        subtitle={headerSubtitle}
        action={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <ActionButton intent="view" asChild>
              <Link to={`/app/admin/jornadas/${id}`}>Ficha</Link>
            </ActionButton>
            <ActionButton intent="back" asChild>
              <Link to="/app/admin/jornadas">Listado</Link>
            </ActionButton>
            {inst && (
              <ActionButton
                intent="primary"
                disabled={globalSaving || !anythingDirty}
                onClick={handleSaveAll}
              >
                {globalSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </ActionButton>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        {detailQ.isError && (
          <p className="text-sm text-destructive">
            {detailQ.error instanceof ApiError
              ? detailQ.error.message
              : 'Error al cargar la jornada'}
          </p>
        )}

        {detailQ.isLoading && (
          <div className="space-y-4">
            <div className="h-10 w-72 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-32 bg-muted/50 rounded-xl animate-pulse opacity-70" />
          </div>
        )}

        {detailQ.data && (
          <Tabs value={builderSection} onValueChange={setBuilderSection} className="gap-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
              <TabsTrigger value="general" className="gap-1.5">
                Datos generales
                {metaDirty && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden title="Sin guardar" />
                )}
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5">
                Proyectos
                {projectsDirty && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden title="Sin guardar" />
                )}
              </TabsTrigger>
              <TabsTrigger value="form" className="gap-1.5">
                Formulario · módulos
                {moduleDirtyCount > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden title="Sin guardar" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Estado actual
                </span>
                <EventStatusBadge status={detailQ.data.instance.status} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos generales</CardTitle>
                  <CardDescription>Título, tipo, fechas y estado de publicación.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-title">Título</Label>
                    <Input
                      id="meta-title"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tipo de jornada</Label>
                      <Select value={metaType} onValueChange={setMetaType}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activity">{labelInstanceType('activity')}</SelectItem>
                          <SelectItem value="custom">{labelInstanceType('custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Select value={metaStatus} onValueChange={setMetaStatus}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{labelInstanceStatus('draft')}</SelectItem>
                          <SelectItem value="open">{labelInstanceStatus('open')}</SelectItem>
                          <SelectItem value="closed">{labelInstanceStatus('closed')}</SelectItem>
                          <SelectItem value="cancelled">
                            {labelInstanceStatus('cancelled')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Inicio</Label>
                      <Input
                        type="datetime-local"
                        value={startsLocal}
                        onChange={(e) => setStartsLocal(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Límite respuestas</Label>
                      <Input
                        type="datetime-local"
                        value={deadlineLocal}
                        onChange={(e) => setDeadlineLocal(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Proyectos participantes</CardTitle>
                  <CardDescription>
                    Define qué proyectos pueden ver esta jornada en listados y al responder. En la
                    pestaña <strong>Formulario</strong>, cada módulo puede restringirse aún más.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectPicker
                    projects={projectsQ.data ?? []}
                    selected={evProjects}
                    onChange={setEvProjects}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="form" className="space-y-6 mt-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Módulos de la respuesta</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Agregar módulos, grupos y opciones es inmediato. Editá el contenido y usá
                    <strong> Guardar cambios</strong> para confirmar las ediciones.
                  </p>
                </div>
                <ActionButton intent="primary" onClick={() => addModule.mutate()} disabled={addModule.isPending}>
                  {addModule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Módulo'}
                </ActionButton>
              </div>

              {sortedModules.length > 1 && (
                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Índice</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="flex flex-wrap gap-2">
                      {sortedModules.map((md, i) => (
                        <li key={md.module.id}>
                          <ActionButton
                            type="button"
                            intent="secondary"
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={() => scrollToModule(md.module.id)}
                          >
                            {i + 1}. {md.module.title}
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {sortedModules.map((md, i) => (
                  <EventModuleEditorCard
                    key={moduleEditorResetKey(md)}
                    md={md}
                    projects={projectsQ.data ?? []}
                    token={token!}
                    anchorId={`module-${md.module.id}`}
                    defaultOpen={i === 0}
                    onDeleteModule={() => delModule.mutate(md.module.id)}
                    onAddGroup={() => addGroup.mutate(md.module.id)}
                    onAddOption={(groupId) => addOption.mutate(groupId)}
                    onSaved={invalidateDetail}
                    onRegisterSaver={registerModuleSaver}
                    onDirtyChange={handleModuleDirtyChange}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
