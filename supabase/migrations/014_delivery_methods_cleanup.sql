-- 停用交貨便
UPDATE delivery_methods SET is_active = false WHERE name = '交貨便';

-- 移除名稱中的「取貨」
UPDATE delivery_methods SET name = '7-11' WHERE name = '7-11 取貨';
UPDATE delivery_methods SET name = '全家' WHERE name = '全家取貨';
