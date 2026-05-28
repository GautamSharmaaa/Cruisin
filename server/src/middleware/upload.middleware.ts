// Governed by .rules v1.0
import multer from 'multer';
import { ApiError } from '../utils/api-error.js';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback): void => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new ApiError(400, 'Only JPEG, PNG and WebP images are allowed'));
      return;
    }
    callback(null, true);
  }
});
