import multer from "multer";
import path from "path";
import { AppError } from "../utils/AppError.ts";

// Disk storage — for image uploads (avatars). Files written to uploads/ directory.
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["audio/webm", "audio/wav", "audio/mpeg", "image/png", "image/jpeg"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Unsupported file type", 400));
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (AUDIO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported audio format. Accepted: ${AUDIO_MIMES.join(", ")}`, 400));
    }
  },
});
