-- Seed default Front Desk products and minibar standards for Hung Phuoc Hotel.
-- Kept as a migration because `supabase db push` does not run seed.sql on Cloud.

INSERT INTO products (
  id,
  property_id,
  sku,
  name,
  kind,
  category,
  unit,
  default_price,
  cost_price,
  track_inventory,
  stock_quantity
) VALUES
  ('d1000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-MN-WATER', 'Nước suối 500ml', 'stock', 'Minibar', 'chai', 10000, 4000, true, 200),
  ('d1000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-MN-COKE', 'Nước ngọt lon', 'stock', 'Minibar', 'lon', 15000, 7000, true, 120),
  ('d1000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-MN-NOODLE', 'Mì ly', 'stock', 'Minibar', 'ly', 20000, 9000, true, 80),
  ('d1000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SV-LAUNDRY', 'Giặt ủi', 'service', 'Dịch vụ', 'kg', 30000, 0, false, 0),
  ('d1000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SC-EARLY', 'Phụ thu nhận phòng sớm', 'surcharge', 'Phụ thu', 'lượt', 50000, 0, false, 0),
  ('d1000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SC-LATE', 'Phụ thu trả phòng muộn', 'surcharge', 'Phụ thu', 'giờ', 50000, 0, false, 0),
  ('d1000001-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SC-DAMAGE', 'Bồi thường hư hỏng', 'surcharge', 'Phụ thu', 'lượt', 0, 0, false, 0)
ON CONFLICT (property_id, sku) DO UPDATE
SET name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    default_price = EXCLUDED.default_price,
    cost_price = EXCLUDED.cost_price,
    track_inventory = EXCLUDED.track_inventory,
    stock_quantity = EXCLUDED.stock_quantity,
    is_active = true,
    updated_at = now();

INSERT INTO room_type_minibar_items (
  room_type_id,
  product_id,
  default_quantity,
  sale_price,
  sort_order
)
SELECT rt.id, p.id, m.default_quantity, m.sale_price, m.sort_order
FROM room_types rt
JOIN (
  VALUES
    ('HP-MN-WATER', 2::numeric, 10000::numeric, 1),
    ('HP-MN-COKE', 2::numeric, 15000::numeric, 2),
    ('HP-MN-NOODLE', 1::numeric, 20000::numeric, 3)
) AS m(sku, default_quantity, sale_price, sort_order) ON true
JOIN products p
  ON p.property_id = rt.property_id
 AND p.sku = m.sku
WHERE rt.property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND rt.business_status::text <> 'selling_service'
ON CONFLICT (room_type_id, product_id) DO UPDATE
SET default_quantity = EXCLUDED.default_quantity,
    sale_price = EXCLUDED.sale_price,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
