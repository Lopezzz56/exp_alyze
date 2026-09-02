export interface BankAccount {
  id: string;
  account_number: string;
  bank_name: string;
  balance: number;
  user_id: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  transaction_date: string;
  raw_narration: string;
  reference_no: string | null;
  withdrawal_dr: number;
  deposit_cr: number;
  balance: number | null;
  payment_rail: string;
  clean_entity: string;
  revenue_stream: string;
  flow_type: string;
  is_pass_through: boolean;
  is_settled: boolean;
  custom_tag?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface UserEntityRule {
  id: string;
  user_id: string;
  pattern: string;
  clean_entity: string;
  revenue_stream: string;
  flow_type: string;
  created_at: string;
}

export interface DashboardStats {
  total_commission_mtd: number;
  total_commission_ytd: number;
  total_commission_period: number;
  active_amcs: number;
  net_inflows: number;
  pending_pass_through: number;
}

export interface MonthlyPayout {
  month: string;
  [key: string]: string | number; // Dynamic AMC columns
}

export interface RevenueSplit {
  name: string;
  value: number;
  color: string;
}

export interface RecentPayout {
  id: string;
  date: string;
  entity: string;
  stream: string;
  amount: number;
  reference_no: string;
}

export interface DashboardMetricsResponse {
  stats: DashboardStats;
  monthly_payouts: MonthlyPayout[];
  revenue_split: RevenueSplit[];
  recent_payouts: RecentPayout[];
}

export interface AIInsight {
  type: 'trend' | 'contribution' | 'warning' | 'success' | 'caution' | 'info' | 'error';
  title: string;
  description: string;
}
