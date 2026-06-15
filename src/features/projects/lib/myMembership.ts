import { listProjectMembers, listProjects } from '@/features/projects/api/projectsApi'

/** Fila de membresía del usuario actual en un proyecto (proviene del listado global + equipo). */
export type MyProjectMembership = {
  id: string
  name: string
  description?: string
  role: string
}

/**
 * Filas de proyecto donde `userId` es miembro. Pagina hasta `maxProjectsPages`.
 * Paraleliza `listProjectMembers` por página.
 *
 * Fase 2 (backend): reemplazar por `GET /api/me/projects` para evitar N+1 y exponer menos datos.
 */
export async function fetchMyProjectMemberships(
  token: string,
  userId: string,
  maxProjectsPages = 15,
): Promise<MyProjectMembership[]> {
  const out: MyProjectMembership[] = []

  for (let page = 1; page <= maxProjectsPages; page++) {
    const res = await listProjects(token, page, 40)
    const withMembers = await Promise.all(
      res.data.map((p) =>
        listProjectMembers(token, p.id).then(({ data: members }) => ({ p, members })),
      ),
    )

    for (const { p, members } of withMembers) {
      const row = members.find((m) => m.user_id === userId)
      if (!row) continue

      const trimmedDesc = p.description.trim()
      out.push({
        id: p.id,
        name: p.name,
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
        role: row.role,
      })
    }

    if (page >= res.total_pages) break
  }

  return out
}
