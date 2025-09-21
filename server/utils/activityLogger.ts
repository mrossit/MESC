import { db } from "../db";
import { activityLogs } from "@shared/schema";
import { Request } from "express";

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
  | "complete_formation_module"
  | "view_reports"
  | "export_report"
  | "send_notification"
  | "view_notifications";

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details?: any,
  req?: Request
) {
  try {
    const activityData: any = {
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date()
    };

    // Add request metadata if available
    if (req) {
      activityData.ipAddress = req.ip || req.socket.remoteAddress;
      activityData.userAgent = req.get('user-agent');
      activityData.sessionId = (req.session as any)?.id;
    }

    await db.insert(activityLogs).values(activityData);
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw error to avoid breaking the main flow
  }
}

// Helper function to log activities with automatic user extraction
export function createActivityLogger(req: Request) {
  return (action: ActivityAction, details?: any) => {
    const userId = (req as any).user?.id;
    if (userId) {
      return logActivity(userId, action, details, req);
    }
  };
}