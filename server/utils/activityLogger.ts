import { db } from "../db";
import { activityLogs } from "@shared/schema";
import { Request } from "express";
import { AuthRequest } from "../auth";
import { randomUUID } from "crypto";

// Activity log insert data type
interface ActivityLogData {
  userId: string;
  action: string;
  details: string | null;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

export type ActivityAction =
  | "login"
  | "logout"
  | "view_dashboard"
  | "view_schedule"
  | "create_schedule"
  | "update_schedule"
  | "respond_questionnaire"
  | "view_questionnaire"
  | "request_substitution"
  | "approve_substitution"
  | "reject_substitution"
  | "update_profile"
  | "view_formation"
  | "create_formation_lesson"
  | "update_formation_lesson"
  | "create_formation_lesson_section"
  | "complete_formation_module"
  | "view_reports"
  | "export_report"
  | "send_notification"
  | "view_notifications";

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details?: Record<string, unknown>,
  req?: Request
) {
  try {
    const activityData: ActivityLogData = {
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date()
    };

    if (!process.env.DATABASE_URL) {
      (activityData as ActivityLogData & { id: string }).id = randomUUID();
    }

    // Add request metadata if available
    if (req) {
      activityData.ipAddress = req.ip || req.socket.remoteAddress || null;
      activityData.userAgent = req.get('user-agent') || null;
      // Session ID is not typically available on standard Request
      activityData.sessionId = null;
    }

    await db.insert(activityLogs).values(activityData);
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw error to avoid breaking the main flow
  }
}

// Helper function to log activities with automatic user extraction
export function createActivityLogger(req: Request | AuthRequest) {
  return (action: ActivityAction, details?: Record<string, unknown>) => {
    const userId = (req as AuthRequest).user?.id;
    if (userId) {
      return logActivity(userId, action, details, req);
    }
  };
}
