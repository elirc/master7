import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { loadConfig } from "@lms/config";
import type { Actor } from "@lms/domain";
import { store } from "./store.js";

const config = loadConfig();

export function signUser(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: "8h" });
}

export interface AuthedRequest extends Request {
  actor?: Actor;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET) as { sub: string };
    const user = store.users.find((candidate) => candidate.id === payload.sub);
    if (!user) return res.status(401).json({ error: "Unknown user" });
    req.actor = { id: user.id, role: user.role, organizationId: user.organizationId };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
