import type { AnswerInputDTO, ModuleDetailDTO } from '@/features/events/model/types'

/** Estado del formulario de respuesta, indexado por group_id. */
export type ResponseFormState = {
  single: Record<string, string>
  multi: Record<string, string[]>
  textVal: Record<string, string>
}

/** Arma el payload de respuestas a partir de los módulos mostrados y el estado del form. */
export function collectAnswers(
  displayMods: ModuleDetailDTO[],
  { single, multi, textVal }: ResponseFormState,
): AnswerInputDTO[] {
  const answers: AnswerInputDTO[] = []
  for (const md of displayMods) {
    for (const gd of md.option_groups) {
      const g = gd.group
      if (g.type === 'single_choice') {
        const oid = single[g.id]
        if (oid) answers.push({ group_id: g.id, option_id: oid })
        continue
      }
      if (g.type === 'multiple_choice') {
        for (const oid of multi[g.id] ?? []) {
          answers.push({ group_id: g.id, option_id: oid })
        }
        continue
      }
      if (g.type === 'text' || g.type === 'number') {
        const raw = (textVal[g.id] ?? '').trim()
        if (raw) answers.push({ group_id: g.id, text_value: raw })
      }
    }
  }
  return answers
}

/** Valida los grupos requeridos; lanza Error con el mensaje correspondiente si falta alguno. */
export function validateRequiredAnswers(
  displayMods: ModuleDetailDTO[],
  { single, multi, textVal }: ResponseFormState,
): void {
  for (const md of displayMods) {
    for (const gd of md.option_groups) {
      const g = gd.group
      if (!g.is_required) continue
      if (g.type === 'single_choice' && !single[g.id]) {
        throw new Error(`Completá: ${g.name}`)
      }
      if (g.type === 'multiple_choice' && (multi[g.id]?.length ?? 0) === 0) {
        throw new Error(`Elegí al menos una opción: ${g.name}`)
      }
      if ((g.type === 'text' || g.type === 'number') && !textVal[g.id]?.trim()) {
        throw new Error(`Completá: ${g.name}`)
      }
    }
  }
}
