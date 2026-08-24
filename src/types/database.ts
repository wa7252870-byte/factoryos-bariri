// FactoryOS Bariri — TypeScript Database Types
// Schema الحقيقي — 38 جدول — Audit: 2026-08-24

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type WageType = 'daily' | 'monthly'
export type WorkerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY'
export type PayrollStatus = 'Draft' | 'Approved' | 'Paid'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type PaymentItemStatus = 'Pending' | 'Paid' | 'OnHold'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type OrgStatus = 'active' | 'inactive' | 'suspended' | 'trial'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial'
export type StockMovementType = 'INBOUND' | 'OUTBOUND'
export type ProductionBatchStatus = 'draft' | 'confirmed' | 'archived'

export type UserRole =
  | 'super_admin'
  | 'platform_owner'
  | 'general_manager'
  | 'factory_manager'
  | 'finance_manager'
  | 'gate_1_officer'
  | 'gate_2_officer'
  | 'production_supervisor'
  | 'warehouse_manager'

export interface Organization {
  id: string; name: string; code: string; status: OrgStatus
  timezone: string; currency: string; manager_name: string | null
  email: string | null; phone: string | null; address: string | null
  activity_type: string | null; metadata: Json | null
  created_at: string; updated_at: string
}

export interface Role { id: string; name: UserRole; created_at: string }

export interface AppUser {
  id: string; organization_id: string; auth_user_id: string
  full_name: string; email: string; phone: string | null
  role_id: string; status: UserStatus; last_login: string | null
  shift_id: string | null; created_at: string; updated_at: string
  role?: Role; organization?: Organization
}

export interface WorkerType { id: string; name: string; code: string; created_at: string }

export interface Shift {
  id: string; name: string; start_time: string; end_time: string
  organization_id: string; is_active: boolean; created_at: string; updated_at: string
}

export interface Worker {
  id: string; organization_id: string; worker_code: string
  full_name: string; national_id: string; phone: string | null
  daily_rate: number; monthly_rate: number; wage_type: WageType
  hire_date: string | null; status: WorkerStatus; notes: string | null
  bank_account: string | null; account_holder_name: string | null
  worker_type_id: string; shift_id: string; created_at: string; updated_at: string
  worker_type?: WorkerType; shift?: Shift
}

export interface GateEntry {
  id: string; organization_id: string; worker_id: string
  entry_date: string; entry_time: string; recorded_by: string | null
  notes: string | null; created_at: string; worker?: Worker
}

export interface ProductionEntry {
  id: string; organization_id: string; worker_id: string
  production_date: string; check_in_time: string
  confirmed_by: string | null; notes: string | null; created_at: string
  worker?: Worker
}

export interface AttendanceRecord {
  id: string; organization_id: string; worker_id: string
  attendance_date: string; status: AttendanceStatus
  wage_type_snapshot: WageType; daily_rate_snapshot: number; monthly_rate_snapshot: number
  shift_id: string; gate1_at: string | null; gate1_by: string | null
  gate2_at: string | null; gate2_by: string | null; notes: string | null
  created_at: string; updated_at: string; worker?: Worker; shift?: Shift
}

export interface Payroll {
  id: string; organization_id: string; payroll_number: string; version: number
  payroll_period_start: string; payroll_period_end: string
  generated_at: string; generated_by: string | null; approved_by: string | null
  status: PayrollStatus; created_at: string; updated_at: string
}

export interface PayrollItem {
  id: string; payroll_id: string; worker_id: string; organization_id: string
  period_start: string; period_end: string; days_present: number
  days_absent: number; days_in_period: number
  wage_type_snapshot: WageType; daily_rate_snapshot: number; monthly_rate_snapshot: number
  calculated_amount: number; adjustments_total: number; final_amount: number
  payment_status: PaymentItemStatus
  bank_account_snapshot: string | null; account_holder_snapshot: string | null
  created_at: string; updated_at: string; worker?: Worker; payroll?: Payroll
}

export interface Payment {
  id: string; organization_id: string; payroll_item_id: string | null
  worker_id: string | null; amount: number; currency: string
  payment_method: string; payment_date: string | null
  bank_account: string | null; account_holder_name: string | null
  status: PaymentStatus; processed_by: string | null
  reference_number: string | null; notes: string | null; created_at: string
}

export interface PaymentReceipt {
  id: string; payment_id: string; organization_id: string
  storage_path: string; file_name: string | null; file_size: number | null
  mime_type: string | null; uploaded_by: string | null; verified_by: string | null
  uploaded_at: string
}

export interface ProductionLine {
  id: string; organization_id: string; name: string
  code: string | null; is_active: boolean; created_at: string
}

export interface Product {
  id: string; organization_id: string; name: string
  code: string; unit: string; created_at: string
}

export interface ProductionBatch {
  id: string; organization_id: string; shift_id: string; batch_date: string
  production_line_id: string | null; supervisor_id: string | null
  total_quantity: number; good_quantity: number; defect_quantity: number
  warehouse_quantity: number; status: ProductionBatchStatus
  created_at: string; updated_at: string
  shift?: Shift; production_line?: ProductionLine
}

export interface ProductionReport {
  id: string; organization_id: string; batch_id: string | null
  supervisor_id: string; report_date: string; shift_id: string
  notes: string | null; images: Json; created_at: string
}

export interface StockMovement {
  id: string; organization_id: string; product_id: string
  movement_type: StockMovementType; quantity: number
  reference: string | null; notes: string | null; shift_id: string | null
  movement_date: string; created_by: string | null; created_at: string
  images: Json | null; product?: Product
}

export interface InventoryBalance {
  id: string; organization_id: string; product_id: string
  current_quantity: number; last_updated: string; product?: Product
}

export interface Notification {
  id: string; organization_id: string | null; user_id: string | null
  type: string; title: string; message: string; severity: string | null
  read_at: string | null; sender_id: string | null
  target_role_id: string | null; priority: string | null; created_at: string
}

export interface SupportTicket {
  id: string; organization_id: string; title: string
  category: string | null; description: string
  priority: TicketPriority; status: TicketStatus
  created_by: string; assigned_to: string | null
  created_at: string; updated_at: string; organization?: Organization
}

export interface SupportMessage {
  id: string; ticket_id: string; organization_id: string
  sender_id: string; message: string; created_at: string
}

export interface SubscriptionPlan {
  id: string; name: string; price: number; currency: string
  features: Json; max_users: number; max_workers: number
  trial_days: number; is_active: boolean; created_at: string; updated_at: string
}

export interface Subscription {
  id: string; organization_id: string; plan_id: string
  start_date: string; end_date: string; status: SubscriptionStatus
  created_at: string; updated_at: string
  organization?: Organization; plan?: SubscriptionPlan
}

export interface AuditLog {
  id: string; organization_id: string | null; user_id: string | null
  action: string; resource_type: string | null; resource_id: string | null
  old_values: Json | null; new_values: Json | null
  ip_address: string | null; created_at: string
}

export interface SystemSetting {
  id: string; organization_id: string; key: string; value: string
  created_at: string; updated_at: string
}

export interface WarehouseReceipt {
  id: string; organization_id: string; batch_id: string | null
  received_date: string; shift_id: string | null; notes: string | null
  created_by: string | null; created_at: string
}

export interface PlatformStaff {
  id: string; auth_user_id: string; full_name: string; email: string
  role: 'platform_owner' | 'super_admin'; created_at: string
}
