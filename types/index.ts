export interface Admin {
  id: number;
  admin_id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin';
  avatar_path?: string;
  is_active: boolean;
  created_at: string;
}

export interface Faculty {
  id: number;
  faculty_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  department: Department;
  position: string;
  date_hired?: string;
  photo_path?: string;
  qr_code_value: string;
  uid: string;
  status: Status;
  valid_until?: number;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: number;
  staff_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: string;
  department?: string;
  date_hired?: string;
  photo_path?: string;
  qr_code_value: string;
  uid: string;
  status: Status;
  valid_until?: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action_type: ActionType;
  module: string;
  target_id?: string;
  target_name?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface GeneratedID {
  id: number;
  person_id: number;
  person_type: 'faculty' | 'staff' | 'student';
  generated_by: number;
  status: 'queued' | 'processing' | 'printed' | 'cancelled';
  pdf_path?: string;
  batch_id?: string;
  created_at: string;
}

export type Department = 'MAPEH' | 'Science' | 'Math' | 'English' | 'Filipino' | 'TLE' | 'ICT' | 'AP' | 'Values Education';
export type Status = 'completed' | 'pending' | 'empty';
export type ActionType = 'LOGIN' | 'LOGOUT' | 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'GENERATE_ID' | 'PRINT' | 'EXPORT' | 'SETTINGS';

export interface DashboardStats {
  totalFaculty: number;
  totalStaff: number;
  idsGenerated: number;
  pendingIds: number;
  recentLogs: AuditLog[];
  deptStatus: DeptStatus[];
}

export interface DeptStatus {
  department: string;
  total: number;
  completed: number;
  pending: number;
  empty: number;
  percentage: number;
}
