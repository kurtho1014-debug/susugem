-- =============================================
-- 005: 圖片儲存
-- 1. 在 activities / materials / products 加 images JSONB 欄位
-- 2. 建立 Supabase Storage bucket: images（public）
-- 3. 設定 RLS 政策
-- =============================================

-- 加入 images 欄位
ALTER TABLE activities ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
ALTER TABLE materials  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products   ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';

-- 建立 Storage bucket（公開讀取，5MB 限制）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS：authenticated 可上傳 / 更新 / 刪除
CREATE POLICY "images_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "images_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "images_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images');

-- anon / authenticated 公開讀取（bucket public=true 已涵蓋，這裡補上 API 層）
CREATE POLICY "images_public_select" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'images');
