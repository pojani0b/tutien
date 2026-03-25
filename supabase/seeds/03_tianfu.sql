-- ============================================================
-- SEED 03: Thiên Phú (Aptitudes) — Hồng Hoang setting
-- Source: file4 lore. This table is used as a reference list
-- in the character creation screen.
-- TODO: Add more entries or replace with your full list.
-- ============================================================

-- We store thiên phú as world_entities of type 'tianfu_ref' on a special server_id='__ref'
-- OR better: as a standalone reference table. We'll use a JSONB config approach via a seed row.
-- For simplicity in the app, the list is embedded in the frontend constants file.
-- This SQL file serves as documentation / alternative DB storage.

-- If you want DB-driven thiên phú list, create a reference table:
CREATE TABLE IF NOT EXISTS ref_tianfu (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE,
  type   TEXT NOT NULL DEFAULT 'tu_luyen', -- tu_luyen|chien_dau|luyen_dan|luyen_khi|tran_phap|phu_luc|ngu_thu|linh_hon|nguyen_to
  desc   TEXT
);

INSERT INTO ref_tianfu (name, type, desc) VALUES
  -- Tu luyện
  ('Thiên Linh Căn', 'tu_luyen', 'Căn cốt vượt trội, hấp thụ linh khí nhanh gấp đôi người thường, ngộ đạo sâu sắc'),
  ('Kim Linh Căn', 'tu_luyen', 'Thiên phú kim hệ thuần nhất, tu luyện kim hệ công pháp tốc độ gấp bội'),
  ('Ngũ Linh Căn', 'tu_luyen', 'Thiên phú ngũ hành, cân bằng, dễ tu luyện đa hướng nhưng không xuất sắc đơn nhất'),
  ('Tán Linh Căn', 'tu_luyen', 'Căn cốt thấp nhất, tu luyện cực kỳ khó khăn, nhưng một khi phá vỡ giới hạn sẽ bùng phát vô hạn'),
  ('Hỗn Nguyên Linh Căn', 'tu_luyen', 'Cực hiếm — thiên phú hội tụ mọi thuộc tính nguyên tố, tiềm năng vô hạn'),
  -- Chiến đấu
  ('Thần Tốc Phản Ứng', 'chien_dau', 'Phản xạ và tốc độ phản ứng trong chiến đấu vượt trội, khó bị bất ngờ'),
  ('Thép Thân Kim Cốt', 'chien_dau', 'Thể chất cứng như sắt, khả năng chịu đòn thiên bẩm, luyện thể hiệu quả gấp nhiều lần'),
  ('Chiến Ý Bất Diệt', 'chien_dau', 'Ý chí chiến đấu không bao giờ bị bẻ gãy, càng gần cái chết càng mạnh hơn'),
  ('Sát Ý Thiên Sinh', 'chien_dau', 'Sinh ra với sát khí, dễ ngộ nhập sát đạo, công kích mang thiên sinh hủy diệt'),
  -- Luyện đan
  ('Dược Vương Túc Duyên', 'luyen_dan', 'Nhạy cảm tuyệt đối với dược tính linh thảo, kiểm soát hỏa hầu tinh vi thiên bẩm'),
  ('Đan Đạo Thiên Mệnh', 'luyen_dan', 'Được thiên đạo chú định theo đuổi đan đạo, mỗi viên đan luyện ra đều mang linh khí đặc biệt'),
  -- Luyện khí
  ('Khí Nhận Thiên Năng', 'luyen_khi', 'Cảm nhận kết cấu linh khí trong khoáng tài, điều khiển hỏa lực chính xác khi rèn luyện'),
  ('Thái Thượng Công Thợ', 'luyen_khi', 'Bẩm sinh hiểu trận văn khắc ấn, pháp bảo luyện ra tự nhiên mang trận văn đặc biệt'),
  -- Trận pháp
  ('Trận Đạo Thần Nhãn', 'tran_phap', 'Nhìn qua địa thế là thấy trận cục, bố trận không cần học vẫn có thể cảm nhận đúng sai'),
  ('Không Gian Cảm Ứng', 'tran_phap', 'Cảm được biến hóa không gian, giúp đặt trận văn không gian và ẩn trận cực kỳ hiệu quả'),
  -- Phù lục
  ('Linh Văn Thiên Tứ', 'phu_luc', 'Bẩm sinh có thể khắc họa linh văn chính xác, phù chú ổn định và uy lực cao'),
  -- Ngự thú
  ('Vạn Thú Thân Duyên', 'ngu_thu', 'Tất cả linh thú bản năng thân cận, ký kết khế ước dễ dàng hơn nhiều'),
  -- Linh hồn
  ('Thần Thức Hải Vô Biên', 'linh_hon', 'Thần thức mạnh mẽ bất thường, cảm nhận thế giới sâu sắc, khó bị tấn công thần niệm'),
  ('Dự Tri Tàn Mộng', 'linh_hon', 'Thỉnh thoảng xuất hiện trực giác mơ hồ về nguy hiểm sắp tới, khó bị phục kích'),
  -- Nguyên tố
  ('Lôi Đình Chi Thể', 'nguyen_to', 'Thiên phú lôi hệ, hấp thụ thiên lôi thay vì bị thương, đột phá lôi kiếp dễ hơn rất nhiều'),
  ('Hỏa Linh Chi Thể', 'nguyen_to', 'Thân thể tương thông hỏa hệ, chịu hỏa công vô hiệu, hỏa hệ pháp thuật uy lực tăng mạnh'),
  ('Băng Tuyết Chi Cốt', 'nguyen_to', 'Thiên phú băng hệ, cơ thể mang hàn khí tự nhiên, băng hệ công pháp tu luyện cực nhanh'),
  ('Hư Không Chi Nhãn', 'nguyen_to', 'Cảm nhận được hư không, bẩm sinh hướng về đại đạo hư không và không gian')
ON CONFLICT (name) DO NOTHING;
