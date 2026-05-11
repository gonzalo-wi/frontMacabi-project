import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FolderKanban, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createProject, deleteProject, listProjects } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

async function fetchAllProjects(token: string): Promise<ProjectDTO[]> {
  const out: ProjectDTO[] = []
  let page = 1
  while (page <= 25) {
    const r = await listProjects(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

export default function AdminProyectosPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  const listQ = useQuery({
    queryKey: ['admin-projects-all', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllProjects(token!),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = listQ.data ?? []
    if (!q) return rows
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    )
  }, [listQ.data, search])

  const createM = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Nombre requerido')
      await createProject(token!, { name: name.trim(), description: description.trim() || undefined })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Proyecto creado.', variant: 'success' })
      setOpen(false)
      setName('')
      setDescription('')
      await qc.invalidateQueries({ queryKey: ['admin-projects-all'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
  })

  const delM = useMutation({
    mutationFn: async (pid: string) => deleteProject(token!, pid),
    onSuccess: async () => {
      setFeedback({ text: 'Proyecto eliminado.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-projects-all'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
  })

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={FolderKanban}
        title="Proyectos"
        subtitle="Administración"
        action={
          <Button
            size="sm"
            onClick={() => {
              setFeedback(null)
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre o descripción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9"
            aria-label="Buscar proyectos"
          />
        </div>

        {listQ.isError && (
          <p className="text-sm text-destructive">
            {listQ.error instanceof ApiError ? listQ.error.message : 'Error'}
          </p>
        )}

        {listQ.isLoading && <div className="h-24 bg-muted/50 rounded-lg animate-pulse" />}

        {!listQ.isLoading && listQ.data && (
          <p className="text-xs text-muted-foreground">
            Mostrando {filtered.length} de {listQ.data.length} proyecto{listQ.data.length === 1 ? '' : 's'}
          </p>
        )}

        {/* Desktop: tabla */}
        {!listQ.isLoading && listQ.data && filtered.length > 0 && (
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="font-medium px-4 py-3 w-[40%]">Proyecto</th>
                  <th className="font-medium px-4 py-3 hidden lg:table-cell">Descripción</th>
                  <th className="font-medium px-4 py-3 text-right w-[1%] whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/80 last:border-0 hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <Link
                        className="font-semibold text-primary hover:underline"
                        to={`/app/admin/proyectos/${p.id}/resumen`}
                      >
                        {p.name}
                      </Link>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 lg:hidden">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground hidden lg:table-cell">
                      <span className="line-clamp-2">{p.description ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
                          <Link to={`/app/admin/proyectos/${p.id}/resumen`}>
                            Abrir
                            <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                              aria-label={`Eliminar ${p.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se perderán vínculos con jornadas y miembros según reglas del servidor.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => delM.mutate(p.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile: tarjetas */}
        {!listQ.isLoading && listQ.data && filtered.length > 0 && (
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-4 space-y-3">
                  <div>
                    <Link
                      className="font-semibold text-primary hover:underline text-base"
                      to={`/app/admin/proyectos/${p.id}/resumen`}
                    >
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{p.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="gap-1" asChild>
                      <Link to={`/app/admin/proyectos/${p.id}/resumen`}>
                        Abrir
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se perderán vínculos con jornadas y miembros según reglas del servidor.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => delM.mutate(p.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!listQ.isLoading && listQ.data && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search.trim() ? 'No hay proyectos que coincidan con la búsqueda.' : 'Todavía no hay proyectos.'}
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <Button
              disabled={createM.isPending}
              onClick={() => {
                setFeedback(null)
                createM.mutate()
              }}
              className="w-full"
            >
              {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
