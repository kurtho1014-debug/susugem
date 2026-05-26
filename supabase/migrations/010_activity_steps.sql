-- 活動步驟設定（JSONB 陣列，每筆 {label: string}）
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS steps JSONB
  DEFAULT '[{"label":"選擇商品"},{"label":"填寫資料"},{"label":"確認送出"}]';

-- 自訂欄位所屬步驟（0 = 第一步商品頁，1..n = 中間自訂步驟）
ALTER TABLE activity_custom_fields
  ADD COLUMN IF NOT EXISTS step_index INTEGER DEFAULT 0;
