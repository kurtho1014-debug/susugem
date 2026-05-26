-- 商品分類（獨立於包材分類）
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_product_categories" ON product_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON product_categories TO authenticated;

-- 在 products 加入供應商與分類欄位
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL;
