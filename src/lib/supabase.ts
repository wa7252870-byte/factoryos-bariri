// FactoryOS Bariri — Supabase Browser Client
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export const supabase = createClient()

export const STORAGE_BUCKETS = {
  PAYMENT_RECEIPTS: 'payment-receipts',
  PRODUCTION_IMAGES: 'production-images',
  WAREHOUSE_IMAGES: 'warehouse-images',
} as const

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) throw new Error(`خطأ في رفع الملف: ${error.message}`)
  return data.path
}

export function getFileUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
