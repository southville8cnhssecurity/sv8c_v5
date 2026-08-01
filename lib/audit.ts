import { query } from './db';

interface LogPayload {
  adminId?: number;
  adminName: string;
  actionType: string;
  module: string;
  targetId?: string | number;
  targetName?: string;
  details?: string;
}

export async function logAction(payload: LogPayload): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (admin_id, admin_name, action_type, module, target_id, target_name, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [payload.adminId || 0, payload.adminName, payload.actionType,
       payload.module, payload.targetId || null, payload.targetName || null, payload.details || null]
    );
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
