import type { NextFunction, Request, Response } from "express";
import { loadConfig } from "@lms/config";
import { logger } from "./logger.js";

export interface ObservedRequest extends Request {
  requestId?: string;
  startedAt?: number;
}

export function requestLogger(req: ObservedRequest, res: Response, next: NextFunction) {
  const requestId = req.headers["x-request-id"]?.toString() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = requestId;
  req.startedAt = Date.now();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - (req.startedAt ?? Date.now());
    const entry = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs
    };
    logger.info("api.request_completed", entry);
  });

  next();
}

export function healthSnapshot() {
  const config = loadConfig();
  return {
    ok: true,
    service: "lms-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    dependencies: {
      database: {
        configured: Boolean(config.DATABASE_URL),
        status: "not_connected_in_feature_02"
      },
      redis: {
        configured: Boolean(process.env.REDIS_URL),
        status: "not_connected_in_feature_02"
      }
    }
  };
}
