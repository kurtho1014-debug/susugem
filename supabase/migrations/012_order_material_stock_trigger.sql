-- 加入訂單包材時，自動扣減庫存
CREATE OR REPLACE FUNCTION fn_order_material_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materials
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_material_after_insert
  AFTER INSERT ON order_materials
  FOR EACH ROW EXECUTE FUNCTION fn_order_material_after_insert();

-- 移除訂單包材時，自動歸還庫存
CREATE OR REPLACE FUNCTION fn_order_material_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materials
  SET stock_quantity = stock_quantity + OLD.quantity
  WHERE id = OLD.material_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_material_after_delete
  AFTER DELETE ON order_materials
  FOR EACH ROW EXECUTE FUNCTION fn_order_material_after_delete();
