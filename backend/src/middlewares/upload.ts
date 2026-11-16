import multer from "multer";
import { AppError } from "../utils/AppError.ts";
import { IMAGE_MIMES } from "../config/storage.ts";

// Memory storage — for avatar image uploads sent to R2 or local disk.
// Keeps the buffer in req.file.buffer; callers route it to storage.ts.
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Only image files are allowed (jpeg, png, webp, gif)", 400));
    }
  },
});

// Memory storage — for audio recordings sent to STT API.
// File is kept as req.file.buffer (not written to disk).
// Accepts the three browser MediaRecorder formats:
//   audio/webm       — Chrome/Edge/Firefox default
//   audio/ogg        — Firefox alternative
//   audio/mp4        — Safari default (AAC codec)
//   audio/mpeg       — MP3 (legacy fallback)
//   audio/wav        — WAV (high quality, large files)
const AUDIO_MIMES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (AUDIO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported audio format. Accepted: ${AUDIO_MIMES.join(", ")}`, 400));
    }
  },
});
