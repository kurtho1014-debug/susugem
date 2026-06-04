-- 更新 order_status CHECK 約束，加入「溝通中」
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('consulting', 'pending', 'confirmed', 'processing', 'completed', 'cancelled'));
