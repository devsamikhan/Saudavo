import type { Request } from "express";
import type { AuthContext } from "./auth/auth.types";

export interface AppRequest extends Request {
  requestId?: string;
  auth?: AuthContext;
}

export function getRequestId(req: AppRequest): string {
  return req.requestId ?? "req_unknown";
}
