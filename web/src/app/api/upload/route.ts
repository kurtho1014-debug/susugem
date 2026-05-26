import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// 每次 request 建立 admin client（server-side only，不暴露給瀏覽器）
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return NextResponse.json({ error: '未提供檔案' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '只允許圖片檔案 (JPG/PNG/WebP/GIF)' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '檔案超過 5MB 限制' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const admin = getAdmin()
    const { error } = await admin.storage
      .from('images')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data } = admin.storage.from('images').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err: any) {
    console.error('Upload API error:', err)
    return NextResponse.json({ error: err.message ?? '上傳失敗' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    const marker = '/storage/v1/object/public/images/'
    const idx = url.indexOf(marker)
    if (idx < 0) return NextResponse.json({ error: 'Invalid url' }, { status: 400 })

    const path = decodeURIComponent(url.slice(idx + marker.length))
    const { error } = await getAdmin().storage.from('images').remove([path])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
