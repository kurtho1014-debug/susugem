-- 每個活動可以獨立設定開放的物流方式，並可覆蓋預設運費
CREATE TABLE activity_delivery_methods (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id        uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  delivery_method_id uuid NOT NULL REFERENCES delivery_methods(id) ON DELETE CASCADE,
  custom_fee         numeric(10,2),   -- NULL 表示沿用 delivery_methods.default_fee
  created_at         timestamptz DEFAULT now(),
  UNIQUE (activity_id, delivery_method_id)
);

ALTER TABLE activity_delivery_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_activity_delivery_methods"
  ON activity_delivery_methods TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_activity_delivery_methods"
  ON activity_delivery_methods FOR SELECT TO anon USING (true);

GRANT ALL    ON activity_delivery_methods TO authenticated;
GRANT SELECT ON activity_delivery_methods TO anon;
