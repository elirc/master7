import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "./policies.js";
import { logger } from "./logger.js";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request") {
    super(400, "VALIDATION_ERROR", message);
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ForbiddenError) return new AppError(403, "FORBIDDEN", error.message);
  if (error instanceof Error && /not found/i.test(error.message)) return new NotFoundError(error.message);
  if (error instanceof Error && /forbidden|does not belong|cannot|only the/i.test(error.message)) return new AppError(403, "FORBIDDEN", error.message);
  return new AppError(500, "INTERNAL_ERROR", "Unexpected server error");
}

export function errorMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const appError = toAppError(error);
  logger[appError.statusCode >= 500 ? "error" : "warn"]("api.request_failed", {
    method: req.method,
    path: req.path,
    statusCode: appError.statusCode,
    code: appError.code,
    error: error instanceof Error ? error.message : String(error)
  });
  return res.status(appError.statusCode).json({ error: { code: appError.code, message: appError.message } });
}
