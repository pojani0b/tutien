-- ============================================================
-- SEED 01: 6 Servers (Hồng Hoang eras)
-- ============================================================
INSERT INTO servers (server_id, name, era_index, era_name, world_time, status) VALUES
  ('s1', 'Hỗn Độn Khai Thiên', 1, 'Hỗn Độn Khai Thiên', 0, '{"open": true}'),
  ('s2', 'Hung Thú Lượng Kiếp', 2, 'Hung Thú Lượng Kiếp', 0, '{"open": true}'),
  ('s3', 'Long Hán Sơ Kiếp',  3, 'Long Hán Sơ Kiếp',  0, '{"open": true}'),
  ('s4', 'Vu Yêu Đại Kiếp',   4, 'Vu Yêu Đại Kiếp',   0, '{"open": true}'),
  ('s5', 'Phong Thần Lượng Kiếp', 5, 'Phong Thần Lượng Kiếp', 0, '{"open": true}'),
  ('s6', 'Tây Du Hậu Kiếp',   6, 'Tây Du Hậu Kiếp',   0, '{"open": true}')
ON CONFLICT (server_id) DO NOTHING;
