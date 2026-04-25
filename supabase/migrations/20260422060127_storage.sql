-- Bucket lưu ảnh task dọn phòng (public read để Owner xem nhanh trong MVP)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;
