export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /**
   * Optional extra fields merged into the JSON error response alongside
   * `success`/`message`/`data` (e.g. `{ needsAgreement: true }` on a 403). Keep
   * keys flat and frontend-friendly — they are spread at the top level.
   */
  public readonly details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
