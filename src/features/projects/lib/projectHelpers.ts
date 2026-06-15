/** Inicial del proyecto para el avatar. */
export function projectInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? 'P'
}

/** Color de badge/avatar para un proyecto (determinístico por hash del nombre). */
export function projectAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ── Rol de miembro (coordinator vs madrij) ──────────────────────

export function memberBorderClass(role: string): string {
  return role === 'coordinator' ? 'border-l-primary' : 'border-l-border/40'
}

export function memberAvatarClass(role: string): string {
  return role === 'coordinator' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
}

export function roleBadgeClass(role: string): string {
  return role === 'coordinator'
    ? 'bg-primary/8 text-primary border-primary/20'
    : 'bg-muted/60 text-muted-foreground border-border/60'
}
