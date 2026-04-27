import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string) || 'meal-images'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[config] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Sube un archivo al bucket de imágenes de menús y devuelve la URL pública.
 * El archivo se guarda como `meals/<timestamp>-<nombre>`.
 */
export async function uploadMealImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `meals/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
