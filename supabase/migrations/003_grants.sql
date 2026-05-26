-- =============================================
-- GRANT 權限設定
-- authenticated（業主）：完整操作
-- anon（客戶）：有限操作
-- =============================================

-- authenticated 完整權限
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- anon 讀取權限
GRANT SELECT ON activities TO anon;
GRANT SELECT ON activity_products TO anon;
GRANT SELECT ON activity_custom_fields TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON product_materials TO anon;
GRANT SELECT ON delivery_methods TO anon;

-- anon 新增訂單權限
GRANT INSERT ON orders TO anon;
GRANT INSERT ON order_items TO anon;
GRANT INSERT ON order_custom_field_values TO anon;

-- sequence 權限（for UUID/serial）
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
