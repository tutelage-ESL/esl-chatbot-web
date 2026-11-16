import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.ts";

// Lazy singleton — server starts even without R2 credentials.
// Any code that uploads must check r2 !== null first (or use uploadToR2 which throws 503).
export const r2 =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      })
    : null;
