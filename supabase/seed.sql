-- =====================================================================
-- Hưng Phước Hotel — Seed data
-- 1 property, 1 owner, 2 cleaners, 10 hạng phòng, 41 phòng lưu trú
-- (tầng 2-5) + 5 gian Bán Dịch Vụ B01-B05 (tầng 1), 5 booking mẫu
-- =====================================================================

-- -------------------- USERS --------------------
INSERT INTO app_users (id, phone, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '0900000001', 'Chị Lan (Chủ khách sạn)', 'owner'),
  ('22222222-2222-2222-2222-222222222222', '0900000002', 'Cô Mai (Dọn phòng)', 'cleaner'),
  ('33333333-3333-3333-3333-333333333333', '0900000003', 'Cô Hồng (Dọn phòng)', 'cleaner');

-- -------------------- PROPERTY --------------------
INSERT INTO properties (id, owner_id, name, address, latitude, longitude) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'Hưng Phước Hotel', '123 Đường Hùng Vương, Quận 5, TP.HCM',
   10.7546, 106.6634);

-- -------------------- SYSTEM SETTINGS --------------------
INSERT INTO system_settings (property_id, hotel_name, hotel_address, hotel_phone, hotel_email,
                             tax_code, vat_enabled, vat_rate, service_charge_enabled, service_charge_rate)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Hưng Phước Hotel',
  '123 Đường Hùng Vương, Quận 5, TP.HCM',
  '028-3838-1234',
  'info@hungphuoc-hotel.vn',
  '0123456789',
  true, 10.00,
  false, 5.00
);

-- -------------------- STAFF PROFILES --------------------
INSERT INTO staff_profiles (user_id, property_id, hourly_rate, weekend_multiplier, holiday_multiplier, bank_account, bank_name) VALUES
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 55000, 1.20, 1.50, '0123456789', 'Vietcombank'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50000, 1.20, 1.50, '0987654321', 'Techcombank');

-- -------------------- ROOM TYPES (10 hạng) --------------------
INSERT INTO room_types (id, property_id, code, name, price_per_day, price_per_hour, price_overnight, capacity, max_capacity, sort_order) VALUES
  ('c1000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000001', 'PHÒNG STANDARD',              380000,  80000, 280000, 2, 2, 1),
  ('c1000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000005', 'PHÒNG SUPERIOR',              480000, 100000, 360000, 2, 2, 2),
  ('c1000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000009', 'PHÒNG DELUXE',                530000, 110000, 400000, 2, 3, 3),
  ('c1000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000013', 'PHÒNG SUITE 1',               680000, 140000, 500000, 2, 3, 4),
  ('c1000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000017', 'PHÒNG STANDARD TRIPLE ROOM',  600000, 120000, 450000, 3, 3, 5),
  ('c1000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000021', 'PHÒNG SUPERIOR TRIPLE ROOM',  680000, 140000, 510000, 3, 3, 6),
  ('c1000001-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000025', 'PHÒNG FAMILY',              1280000, 260000, 960000, 4, 6, 7),
  ('c1000001-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000029', 'PHÒNG APARTMENT',             980000, 200000, 740000, 4, 5, 8),
  ('c1000001-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000033', 'PHÒNG SUITE 2',               680000, 140000, 500000, 2, 3, 9),
  ('c1000001-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP000041', 'Bán Dịch Vụ',                      0,      0,      0, 0, 0, 99);

-- -------------------- PRODUCTS / MINIBAR --------------------
INSERT INTO products (
  id, property_id, sku, name, kind, category, unit,
  default_price, cost_price, track_inventory, stock_quantity
) VALUES
  ('d1000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-MN-WATER', 'Nước suối 500ml', 'stock', 'Minibar', 'chai', 10000, 4000, true, 200),
  ('d1000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-MN-COKE', 'Nước ngọt lon', 'stock', 'Minibar', 'lon', 15000, 7000, true, 120),
  ('d1000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-MN-NOODLE', 'Mì ly', 'stock', 'Minibar', 'ly', 20000, 9000, true, 80),
  ('d1000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SV-LAUNDRY', 'Giặt ủi', 'service', 'Dịch vụ', 'kg', 30000, 0, false, 0),
  ('d1000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SC-EARLY', 'Phụ thu nhận phòng sớm', 'surcharge', 'Phụ thu', 'lượt', 50000, 0, false, 0),
  ('d1000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SC-LATE', 'Phụ thu trả phòng muộn', 'surcharge', 'Phụ thu', 'giờ', 50000, 0, false, 0),
  ('d1000001-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HP-SC-DAMAGE', 'Bồi thường hư hỏng', 'surcharge', 'Phụ thu', 'lượt', 0, 0, false, 0);

INSERT INTO room_type_minibar_items (room_type_id, product_id, default_quantity, sale_price, sort_order)
SELECT rt.id, p.product_id, p.default_quantity, p.sale_price, p.sort_order
FROM room_types rt
CROSS JOIN (
  VALUES
    ('d1000001-0000-0000-0000-000000000001'::uuid, 2::numeric, 10000::numeric, 1),
    ('d1000001-0000-0000-0000-000000000002'::uuid, 2::numeric, 15000::numeric, 2),
    ('d1000001-0000-0000-0000-000000000003'::uuid, 1::numeric, 20000::numeric, 3)
) AS p(product_id, default_quantity, sale_price, sort_order)
WHERE rt.property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND rt.business_status::text <> 'selling_service';

-- -------------------- ROOMS (41 + 5) --------------------
-- Ghi chú phân bổ dựa trên ảnh Hưng Phước cung cấp:
-- Tầng 5 (8): 501 Standard · 502 Apartment · 503 Std Triple · 504 Family · 505 Deluxe · 506 Superior · 507 Family · 508 Standard
-- Tầng 4 (11): 401 Deluxe · 402 Deluxe · 403 Suite 1 · 404 Std Triple · 405 Standard · 406 Sup Triple · 407 Superior · 408 Deluxe · 409 Apartment · 410 Suite 2 · 411 Suite 2
-- Tầng 3 (11): 301 Deluxe · 302 Superior · 303 Suite 1 · 304 Std Triple · 305 Standard · 306 Sup Triple · 307 Suite 1 · 308 Deluxe · 309 Superior · 310 Superior · 311 Standard
-- Tầng 2 (11): 201 Suite 1 · 202 Deluxe · 203 Suite 1 · 204 Std Triple · 205 Standard · 206 Sup Triple · 207 Deluxe · 208 Suite 2 · 209 Superior · 210 Superior · 211 Standard
-- Tầng 1 (5):  B01..B05 Bán Dịch Vụ

-- Tầng 5
INSERT INTO rooms (property_id, room_type_id, name, room_number, floor, default_clean_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.501', '501', 5, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000008', 'P.502', '502', 5, 60, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000005', 'P.503', '503', 5, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000007', 'P.504', '504', 5, 60, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.505', '505', 5, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.506', '506', 5, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000007', 'P.507', '507', 5, 60, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.508', '508', 5, 45, 'available');

-- Tầng 4
INSERT INTO rooms (property_id, room_type_id, name, room_number, floor, default_clean_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.401', '401', 4, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.402', '402', 4, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000004', 'P.403', '403', 4, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000005', 'P.404', '404', 4, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.405', '405', 4, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000006', 'P.406', '406', 4, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.407', '407', 4, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.408', '408', 4, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000008', 'P.409', '409', 4, 60, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000009', 'P.410', '410', 4, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000009', 'P.411', '411', 4, 50, 'available');

-- Tầng 3
INSERT INTO rooms (property_id, room_type_id, name, room_number, floor, default_clean_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.301', '301', 3, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.302', '302', 3, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000004', 'P.303', '303', 3, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000005', 'P.304', '304', 3, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.305', '305', 3, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000006', 'P.306', '306', 3, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000004', 'P.307', '307', 3, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.308', '308', 3, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.309', '309', 3, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.310', '310', 3, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.311', '311', 3, 45, 'available');

-- Tầng 2
INSERT INTO rooms (property_id, room_type_id, name, room_number, floor, default_clean_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000004', 'P.201', '201', 2, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.202', '202', 2, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000004', 'P.203', '203', 2, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000005', 'P.204', '204', 2, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.205', '205', 2, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000006', 'P.206', '206', 2, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000003', 'P.207', '207', 2, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000009', 'P.208', '208', 2, 50, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.209', '209', 2, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000002', 'P.210', '210', 2, 45, 'available'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000001', 'P.211', '211', 2, 45, 'available');

-- Tầng 1: 5 gian Bán Dịch Vụ
INSERT INTO rooms (property_id, room_type_id, name, room_number, floor, default_clean_minutes, status, business_status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000010', 'B01', 'B01', 1, 30, 'available', 'selling_service'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000010', 'B02', 'B02', 1, 30, 'available', 'selling_service'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000010', 'B03', 'B03', 1, 30, 'available', 'selling_service'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000010', 'B04', 'B04', 1, 30, 'available', 'selling_service'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1000001-0000-0000-0000-000000000010', 'B05', 'B05', 1, 30, 'available', 'selling_service');

-- -------------------- SAMPLE BOOKINGS --------------------
-- 1 booking đang ở + 1 booking vừa check-out + 2 booking sắp đến + 1 booking quá khứ
-- Giá tính từ room_type price_per_day
DO $$
DECLARE
  v_room_501 uuid; v_room_202 uuid; v_room_301 uuid; v_room_205 uuid; v_room_405 uuid;
BEGIN
  SELECT id INTO v_room_501 FROM rooms WHERE room_number = '501' AND property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT id INTO v_room_202 FROM rooms WHERE room_number = '202' AND property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT id INTO v_room_301 FROM rooms WHERE room_number = '301' AND property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT id INTO v_room_205 FROM rooms WHERE room_number = '205' AND property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT id INTO v_room_405 FROM rooms WHERE room_number = '405' AND property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Phòng 202 đang ở (Deluxe 530k x 3 đêm)
  INSERT INTO bookings (room_id, guest_name, guest_phone, checkin_at, checkout_at, status, booking_type,
                        adults, nights, unit_price, room_charge, vat_rate, vat_amount, total_amount,
                        deposit_amount, notes)
  VALUES (v_room_202, 'Anh Tuấn', '0911111111',
          now() - INTERVAL '1 day', now() + INTERVAL '2 days', 'checked_in', 'daily',
          2, 3, 530000, 1590000, 10.00, 159000, 1749000,
          500000, 'Khách VIP');

  UPDATE rooms SET status = 'occupied' WHERE id = v_room_202;

  -- Phòng 301 đang ở (Deluxe)
  INSERT INTO bookings (room_id, guest_name, guest_phone, checkin_at, checkout_at, status, booking_type,
                        adults, nights, unit_price, room_charge, vat_rate, vat_amount, total_amount,
                        deposit_amount, notes)
  VALUES (v_room_301, 'Chị Hương', '0922222222',
          now() - INTERVAL '2 hours', now() + INTERVAL '1 day', 'checked_in', 'daily',
          2, 1, 530000, 530000, 10.00, 53000, 583000,
          0, NULL);

  UPDATE rooms SET status = 'occupied' WHERE id = v_room_301;

  -- Phòng 501 vừa check-out (Standard 380k x 2 đêm)
  INSERT INTO bookings (room_id, guest_name, guest_phone, checkin_at, checkout_at,
                        actual_checkin_at, actual_checkout_at, status, booking_type,
                        adults, nights, unit_price, room_charge, vat_rate, vat_amount, total_amount,
                        deposit_amount, paid_amount, notes)
  VALUES (v_room_501, 'LÊ PHƯƠNG DUY', '0302803331',
          now() - INTERVAL '3 days', now() - INTERVAL '2 hours',
          now() - INTERVAL '3 days', now() - INTERVAL '2 hours', 'checked_out', 'daily',
          2, 2, 380000, 760000, 10.00, 76000, 836000,
          0, 836000, NULL);

  -- Phòng 205 upcoming
  INSERT INTO bookings (room_id, guest_name, guest_phone, checkin_at, checkout_at, status, booking_type,
                        adults, nights, unit_price, room_charge, vat_rate, vat_amount, total_amount, notes)
  VALUES (v_room_205, 'Gia đình Nam', '0955555555',
          now() + INTERVAL '1 day', now() + INTERVAL '3 days', 'upcoming', 'daily',
          4, 2, 380000, 760000, 10.00, 76000, 836000, '4 người lớn, 2 trẻ em');

  -- Phòng 405 upcoming sau 3h
  INSERT INTO bookings (room_id, guest_name, guest_phone, checkin_at, checkout_at, status, booking_type,
                        adults, nights, unit_price, room_charge, vat_rate, vat_amount, total_amount, notes)
  VALUES (v_room_405, 'Chị Thu', '0944444444',
          now() + INTERVAL '3 hours', now() + INTERVAL '2 days', 'upcoming', 'daily',
          2, 2, 380000, 760000, 10.00, 76000, 836000, NULL);

  -- Payment cho booking đã check-out của 501
  INSERT INTO payments (booking_id, amount, method, type, received_at)
  SELECT id, 836000, 'cash', 'balance', now() - INTERVAL '2 hours'
  FROM bookings WHERE room_id = v_room_501 AND status = 'checked_out';

  -- Payment deposit cho phòng 202
  INSERT INTO payments (booking_id, amount, method, type, received_at)
  SELECT id, 500000, 'bank', 'deposit', now() - INTERVAL '1 day'
  FROM bookings WHERE room_id = v_room_202 AND status = 'checked_in';
END $$;

-- -------------------- ASSIGN 1 TASK TO DEMO CLEANER --------------------
UPDATE cleaning_tasks
SET assigned_to = '22222222-2222-2222-2222-222222222222', status = 'assigned'
WHERE booking_id IN (SELECT id FROM bookings WHERE room_id = (SELECT id FROM rooms WHERE room_number = '501'));
