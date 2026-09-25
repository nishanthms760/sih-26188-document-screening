export interface User {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'OFFICER' | 'ANALYST';
  created_at: string;
}

export interface Document {
  id: number;
  file_path: string;
  document_type: string;
  file_hash: string;
  uploaded_at: string;
}

export interface OCRResult {
  id: number;
  name: string | null;
  document_number: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  gender: string | null;
  expiry_date: string | null;
  confidence: number;
  raw_data: Record<string, any> | null;
}

export interface ValidationResult {
  id: number;
  field: string;
  status: 'VALID' | 'WARNING' | 'INVALID';
  message: string | null;
}

export interface SuspiciousRegion {
  region?: string;
  anomaly: string;
  severity: number;
  bbox: [number, number, number, number];
}

export interface TamperingResult {
  id: number;
  photo_replacement_score: number;
  text_manipulation_score: number;
  stamp_score: number;
  metadata_score: number;
  overall_probability: number;
  suspicious_regions?: SuspiciousRegion[];
}

export interface FaceResult {
  id: number;
  similarity_score: number;
  match_status: 'VERIFIED' | 'POSSIBLE_MATCH' | 'MISMATCH';
}

export interface RiskFactor {
  factor: string;
  change: number;
}

export interface RiskResult {
  id: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: RiskFactor[] | null;
}

export interface AuditLog {
  id: number;
  action: string;
  timestamp: string;
  current_hash: string | null;
  previous_hash: string | null;
  user_id: number | null;
}

export interface Screening {
  id: number;
  screening_id: string;
  document_type: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLEARED' | 'CLOSED';
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  completed_at: string | null;
  user_id?: number;
  user?: User;
  document?: Document;
  ocr_result?: OCRResult;
  validation_results?: ValidationResult[];
  tampering_result?: TamperingResult;
  face_result?: FaceResult;
  risk_result?: RiskResult;
  audit_logs?: AuditLog[];
}

export interface DashboardStats {
  total_screened: number;
  valid_count: number;
  suspicious_count: number;
  high_risk_count: number;
  avg_screening_time: number;
  face_failures: number;
}

export interface AnalyticsTrendItem {
  date: string;
  total: number;
  suspicious: number;
  high_risk: number;
}

export interface RiskDistributionStats {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface DocumentTypeStats {
  passport: number;
  visa: number;
  national_id: number;
  driving_licence: number;
  permit: number;
  other: number;
}

export interface AnalyticsDashboardData {
  stats: DashboardStats;
  trend: AnalyticsTrendItem[];
  risk_distribution: RiskDistributionStats;
  document_distribution: DocumentTypeStats;
}
