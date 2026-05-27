import { Router } from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Dev-only router — mounted at /api/v1/dev (never active in production)
// Routes:
//   GET /api/v1/dev/voice-test   — voice + text chat pipeline tester
//   GET /api/v1/dev/fib-test     — FIB subscription flow tester

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src blob: data: *",
  "connect-src *",
].join("; ");

function serveHtml(filePath: string) {
  return (_req: any, res: any) => {
    const html = readFileSync(filePath, "utf-8");
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Security-Policy", CSP);
    res.send(html);
  };
}

router.get(
  "/voice-test",
  serveHtml(join(__dirname, "../../modules/messages/voice-test.html")),
);

router.get(
  "/fib-test",
  serveHtml(join(__dirname, "../../modules/subscriptions/fib-test.html")),
);

export default router;
