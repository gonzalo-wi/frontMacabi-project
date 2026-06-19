import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, Eye, Loader2, Newspaper, Pencil, Plus, Send, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProjectPicker } from '@/features/projects/components/ProjectPicker'
import { fetchAllProjects } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'
import { NewsPreview } from './NewsPreview'
import {
  createNews,
  patchNews,
  removeNewsImage,
  uploadNewsImage,
  validateNewsImage,
  NEWS_IMAGE_ACCEPT,
} from '../api/newsApi'
import type { NewsDTO } from '../model/types'

type Props = {
  token: string
  /** Si viene, el dialog opera en modo edición. */
  news?: NewsDTO
  onSaved: () => void | Promise<void>
  /** Trigger custom; si no se pasa, se usa el botón "Nueva noticia". */
  trigger?: ReactNode
}

export function NewsFormDialog({ token, news, onSaved, trigger }: Props) {
  const isEdit = Boolean(news)
  const isPublished = news?.status === 'published'

  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(news?.title ?? '')
  const [body, setBody] = useState(news?.body ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImg, setRemoveImg] = useState(false)
  const [renotify, setRenotify] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [projIds, setProjIds] = useState<Set<string>>(new Set(news?.project_ids ?? []))
  const [vizOpen, setVizOpen] = useState(false)

  const projectsQ = useQuery({
    queryKey: queryKeys.projects.allP1(token),
    queryFn: () => fetchAllProjects(token),
    enabled: open,
    staleTime: 5 * 60_000,
  })
  const projects = projectsQ.data ?? []

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function reset() {
    setTitle(news?.title ?? '')
    setBody(news?.body ?? '')
    setImageFile(null)
    setRemoveImg(false)
    setRenotify(false)
    setPreviewMode(false)
    setProjIds(new Set(news?.project_ids ?? []))
    setVizOpen(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function pickImage(file: File) {
    const err = validateNewsImage(file)
    if (err) {
      toast.error(err)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setRemoveImg(false)
    setImageFile(file)
  }

  function clearImage() {
    if (imageFile) {
      setImageFile(null) // vuelve a mostrar la existente (si la había)
    } else {
      setRemoveImg(true) // marca la existente para quitar al guardar
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  // Imagen visible en la previsualización: nueva > existente (salvo que se haya quitado).
  const shownImageUrl = imageFile ? imagePreviewUrl : removeImg ? null : news?.image_url ?? null

  const saveM = useMutation({
    mutationFn: async (publish: boolean | undefined) => {
      const t = title.trim()
      const b = body.trim()
      if (!t) throw new Error('Ingresá un título')
      if (!b) throw new Error('Ingresá el contenido')
      if (imageFile) {
        const err = validateNewsImage(imageFile)
        if (err) throw new Error(err)
      }

      const projectIds = [...projIds]

      if (!isEdit) {
        await createNews(token, { title: t, body: b, publish: publish ?? false, project_ids: projectIds }, imageFile)
        return
      }

      const id = news!.id
      // Imagen primero, para que al publicar la noticia ya la tenga adjunta.
      if (imageFile) await uploadNewsImage(token, id, imageFile)
      else if (removeImg) await removeNewsImage(token, id)
      await patchNews(token, id, {
        title: t,
        body: b,
        publish,
        renotify: isPublished ? renotify : undefined,
        project_ids: projectIds,
      })
    },
    onSuccess: async () => {
      setOpen(false)
      reset()
      await onSaved()
    },
    onError: (e) => {
      toast.error(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo guardar la noticia',
      )
    },
  })

  const pending = saveM.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        reset()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nueva noticia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            {isEdit ? 'Editar noticia' : 'Nueva noticia'}
          </DialogTitle>
        </DialogHeader>

        {previewMode ? (
          <div className="pt-1">
            <NewsPreview title={title} body={body} imageUrl={shownImageUrl} dateLabel="Previsualización" />
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <FormField label="Título" htmlFor="news-title" required>
              <Input
                id="news-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la noticia"
                maxLength={160}
              />
            </FormField>

            <FormField label="Contenido" htmlFor="news-body" required>
              <Textarea
                id="news-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribí la noticia…"
                className="min-h-[160px]"
              />
            </FormField>

            <FormField label="Imagen" htmlFor="news-image" hint="Opcional. JPG, PNG o WebP hasta 2 MB.">
              {shownImageUrl ? (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                    <img src={shownImageUrl} alt="" className="w-full max-h-48 object-cover" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={clearImage}>
                    <X className="w-3.5 h-3.5 mr-1" />
                    Quitar imagen
                  </Button>
                </div>
              ) : (
                <Input
                  id="news-image"
                  ref={fileRef}
                  type="file"
                  accept={NEWS_IMAGE_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) pickImage(file)
                  }}
                  className="file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-xs"
                />
              )}
            </FormField>

            <Collapsible
              open={vizOpen}
              onOpenChange={setVizOpen}
              className="rounded-lg border bg-muted/20 overflow-hidden"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/35 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      vizOpen && 'rotate-180',
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Visibilidad por proyecto</span>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {projIds.size === 0
                        ? 'Visible para todos los miembros (todos los proyectos).'
                        : `Dirigida a ${projIds.size} proyecto${projIds.size === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 border-t border-border/80 bg-muted/10 px-3 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Opcional: elegí a qué proyectos va dirigida. Si no marcás ninguno, la ven y la
                    reciben todos los miembros.
                  </p>
                  <ProjectPicker projects={projects} selected={projIds} onChange={setProjIds} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {isEdit && isPublished && (
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={renotify}
                  onChange={(e) => setRenotify(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Reenviar notificaciones a todos los miembros
              </label>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewMode((v) => !v)}>
            {previewMode ? (
              <>
                <Pencil className="w-4 h-4 mr-1.5" />
                Volver a editar
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1.5" />
                Previsualizar
              </>
            )}
          </Button>

          <div className="flex-1" />

          {isEdit && isPublished ? (
            <Button disabled={pending} onClick={() => saveM.mutate(undefined)}>
              {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Guardar cambios
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={pending} onClick={() => saveM.mutate(false)}>
                Guardar borrador
              </Button>
              <Button disabled={pending} onClick={() => saveM.mutate(true)}>
                {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Publicar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
