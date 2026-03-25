-- ============================================================
-- SEED 04: Tài Năng (Skills/Talents) — Hồng Hoang setting
-- Source: file5 lore
-- TODO: Replace/extend with your full tài năng list
-- ============================================================

CREATE TABLE IF NOT EXISTS ref_talent (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE,
  type   TEXT NOT NULL DEFAULT 'social', -- social|combat|craft|leadership|strategy
  desc   TEXT
);

INSERT INTO ref_talent (name, type, desc) VALUES
  -- Xã hội / Social
  ('Thiện Ngôn Lệnh Sắc', 'social', 'Lời nói khéo léo, đúng lúc đúng chỗ, hóa giải xung đột và kết giao bằng hữu dễ dàng'),
  ('Hùng Biện Thuyết Khách', 'social', 'Tài diễn thuyết trước đám đông, lời nói có khí thế và sức hiệu triệu mạnh mẽ'),
  ('Thuyết Phục Tâm Lý', 'social', 'Hiểu tâm lý đối phương, đánh vào lợi ích và nỗi sợ, khiến đối phương dễ thay đổi quyết định'),
  ('Đàm Phán Cao Thủ', 'social', 'Trong mọi giao dịch và liên minh, luôn giữ được lợi ích lớn nhất cho bản thân và phe mình'),
  ('Mặt Dày Tâm Đen', 'social', 'Không bao giờ để lộ cảm xúc thật, có thể cười nói vui vẻ trong khi toan tính thâm sâu'),
  ('Ký Ức Hoàn Hảo', 'social', 'Nhớ từng chi tiết, tên người, sự kiện, lời hứa — không bao giờ bị qua mặt bởi thông tin'),
  -- Lãnh đạo / Leadership
  ('Đế Vương Khí Tức', 'leadership', 'Phát ra aura lãnh đạo tự nhiên, người khác dễ phục tùng và tin tưởng'),
  ('Thu Phục Nhân Tâm', 'leadership', 'Biết dùng người đúng vị trí, khiến thuộc hạ trung thành tận tụy về lâu dài'),
  ('Quân Sự Thiên Tư', 'leadership', 'Dẫn dắt quân đội, lên chiến lược đánh trận với tầm nhìn vượt trội'),
  -- Chiến đấu kỹ năng / Combat skill
  ('Đọc Thế Chiến Đấu', 'combat', 'Nhận ra sơ hở đối phương nhanh hơn người thường, phán đoán thời điểm tấn công tốt'),
  ('Võ Học Thiên Tài', 'combat', 'Xem qua một lần là hiểu, học võ học nhanh gấp ba người thường'),
  ('Ám Khí Tinh Thông', 'combat', 'Thuần thục mọi loại ám khí, ném phóng không cần ngẫm nghĩ'),
  -- Mưu lược / Strategy
  ('Trăm Mưu Nghìn Kế', 'strategy', 'Luôn có nhiều hơn một kế hoạch dự phòng, hiếm khi rơi vào thế bí'),
  ('Thiên Cơ Quan Sát', 'strategy', 'Quan sát thế cục, nhận ra xu hướng trước người khác nhiều bước'),
  ('Phán Đoán Nhân Tâm', 'strategy', 'Chỉ cần tiếp xúc ngắn là đoán được mục đích thực sự của đối phương'),
  ('Thanh Tâm Quả Đoán', 'strategy', 'Đầu óc lạnh lùng, ra quyết định nhanh trong tình huống khẩn cấp không sai lệch'),
  -- Thủ công / Craft
  ('Bác Học Đa Tài', 'craft', 'Học rộng biết nhiều, am hiểu nhiều nghề như đan dược, luyện khí, phù lục ở mức cơ bản'),
  ('Truyền Đạo Sư Biểu', 'craft', 'Giảng giải công pháp rõ ràng, đệ tử học nhanh hơn khi được chỉ dạy'),
  ('Linh Vật Cảm Thông', 'craft', 'Cảm nhận được linh tính ẩn chứa trong linh thảo, linh khoáng, nhận biết phẩm chất nhanh')
ON CONFLICT (name) DO NOTHING;
