-- =============================================
-- RLS 政策設定
-- 業主後台：登入用戶可完整操作
-- 客戶前台：只能讀取上架商品與活動、新增訂單
-- =============================================

-- 啟用 RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 後台管理：登入用戶可完整操作所有 table
-- =============================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'members', 'suppliers', 'material_categories', 'materials',
    'material_discount_rules', 'supplier_shipping_rules',
    'products', 'product_materials', 'delivery_methods',
    'activities', 'activity_products', 'activity_custom_fields',
    'orders', 'order_items', 'order_custom_field_values',
    'activity_materials', 'procurement_orders', 'procurement_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('
      CREATE POLICY "authenticated_all_%s"
      ON %I
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END $$;

-- =============================================
-- 客戶前台（anon）：
-- 只能讀取進行中的活動、上架商品、物流方式
-- 可以新增訂單與訂單商品
-- =============================================

-- 活動：anon 只能讀 active 的
CREATE POLICY "anon_read_active_activities"
ON activities FOR SELECT TO anon
USING (status = 'active');

-- 活動商品：anon 可讀
CREATE POLICY "anon_read_activity_products"
ON activity_products FOR SELECT TO anon
USING (true);

-- 活動自訂欄位：anon 可讀
CREATE POLICY "anon_read_activity_custom_fields"
ON activity_custom_fields FOR SELECT TO anon
USING (true);

-- 商品：anon 只能讀上架的
CREATE POLICY "anon_read_active_products"
ON products FOR SELECT TO anon
USING (is_active = true);

-- 物流方式：anon 可讀
CREATE POLICY "anon_read_delivery_methods"
ON delivery_methods FOR SELECT TO anon
USING (true);

-- 訂單：anon 可新增
CREATE POLICY "anon_insert_orders"
ON orders FOR INSERT TO anon
WITH CHECK (true);

-- 訂單商品：anon 可新增
CREATE POLICY "anon_insert_order_items"
ON order_items FOR INSERT TO anon
WITH CHECK (true);

-- 訂單自訂欄位值：anon 可新增
CREATE POLICY "anon_insert_order_custom_field_values"
ON order_custom_field_values FOR INSERT TO anon
WITH CHECK (true);
