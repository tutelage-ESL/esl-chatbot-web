import { Resend } from "resend";
import { env } from "./env.ts";

// Resend client — instantiated lazily so the server starts even without the key.
// Any service that sends email must check env.RESEND_API_KEY first and throw
// AppError(503) with a clear message if it is missing.
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
