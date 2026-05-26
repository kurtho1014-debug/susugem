-- 商品加入成本價欄位（業主內部用，不對客戶顯示）
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
