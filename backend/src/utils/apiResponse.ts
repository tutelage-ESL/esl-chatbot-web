import type { Response } from "express";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponsePayload<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: PaginationMeta,
): void {
  const payload: ApiResponsePayload<T> = { success: true, message, data };
  if (meta) payload.meta = meta;
  res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
): void {
  res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}
