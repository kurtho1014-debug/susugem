-- =============================================
-- Schema 修正
-- 1. activity_products: price → custom_price, 新增 stock_limit
-- 2. activity_custom_fields: field_name → label
-- =============================================

-- activity_products: rename price → custom_price, add stock_limit
ALTER TABLE activity_products RENAME COLUMN price TO custom_price;
ALTER TABLE activity_products ADD COLUMN IF NOT EXISTS stock_limit integer;

-- activity_custom_fields: rename field_name → label
ALTER TABLE activity_custom_fields RENAME COLUMN field_name TO label;
