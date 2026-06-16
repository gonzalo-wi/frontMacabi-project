import { listProjectMembers, listProjects } from '@/features/projects/api/projectsApi'

export type UserProjectLink = {
  projectId: string
  projectName: string
  role: string
}

export type UserProjectsByUserId = Record<string, UserProjectLink[]>

/**
 * Lista todos los proyectos y miembros, y arma mapa usuario → proyectos.
 * Muchas llamadas HTTP en paralelo por página de proyectos; invalidar cuando cambien miembros.
 */
export async function fetchUserProjectsByUser(token: string): Promise<UserProjectsByUserId> {
  const idx: UserProjectsByUserId = {}
  let page = 1
  while (page <= 25) {
    const r = await listProjects(token, { page, pageSize: 50 })
    await Promise.all(
      r.data.map(async (p) => {
        const { data: members } = await listProjectMembers(token, p.id)
        for (const m of members) {
          const uid = m.user_id
          if (!idx[uid]) idx[uid] = []
          idx[uid].push({
            projectId: p.id,
            projectName: p.name,
            role: m.role,
          })
        }
      }),
    )
    if (page >= r.total_pages) break
    page++
  }
  for (const uid of Object.keys(idx)) {
    idx[uid].sort((a, b) => a.projectName.localeCompare(b.projectName, 'es'))
  }
  return idx
}
