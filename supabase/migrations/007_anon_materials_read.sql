-- 讓匿名使用者（前台客戶）可以讀取包材與活動包材資料
-- 前台活動頁面顯示「此活動包裝材料」用

CREATE POLICY "anon_select_materials"
  ON materials FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_activity_materials"
  ON activity_materials FOR SELECT TO anon USING (true);

-- GRANT SELECT 給 anon role（RLS policy 之外還需要 GRANT）
GRANT SELECT ON materials TO anon;
GRANT SELECT ON activity_materials TO anon;
