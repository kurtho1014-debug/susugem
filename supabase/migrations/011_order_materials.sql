-- 訂單包材（業主針對單筆訂單手動指定使用的包材）
CREATE TABLE IF NOT EXISTS order_materials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE order_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_order_materials" ON order_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON order_materials TO authenticated;
