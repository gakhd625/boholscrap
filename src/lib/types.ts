// ===========================================
// Shared TypeScript types for the application
// ===========================================

// --- Database Row Types ---

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  id_type: string;
  id_number: string;
  normalized_id_number: string;
  address: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdDocument {
  id: string;
  customer_id: string;
  id_type: string;
  id_number: string;
  storage_path: string;
  ocr_raw_data: Record<string, unknown> | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export type TransactionType = 'buy' | 'sell' | 'pawn' | 'trade' | 'repair' | 'other';

export const KARAT_OPTIONS = [
  '6K', '8K', '9K', '10K', '12K', '14K', '16K', '18K', '20K', '21K', '22K', '23K', '24K', '70%'
] as const;

export type KaratOption = typeof KARAT_OPTIONS[number];

export interface TransactionItem {
  id: string; // client-side generated for keys
  description: string;
  weight: number;
  karat: KaratOption | string;
  pricePerGram: number;
  itemTotal: number;
}

export interface Transaction {
  id: string;
  customer_id: string;
  id_document_id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  amount: number;
  items: TransactionItem[] | null;
  staff_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  staff_id: string | null;
  action: string;
  customer_id: string | null;
  transaction_id: string | null;
  metadata: Record<string, unknown> | null;
}

// --- Joined / Extended Types ---

export interface TransactionWithDetails extends Transaction {
  customer?: Customer;
  id_document?: IdDocument;
  staff?: Profile;
}

export interface CustomerWithTransactions extends Customer {
  transactions?: Transaction[];
  id_documents?: IdDocument[];
}

// --- OCR / Extraction Types ---

export interface ExtractedIdData {
  fullName: string | null;
  idType: string | null;
  idNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  expirationDate: string | null;
  confidence: number | null;
}

export interface ExtractionResult {
  success: boolean;
  data: ExtractedIdData;
  error?: string;
  provider: string;
}

// --- Form / Workflow Types ---

export interface ConfirmedCustomerData {
  fullName: string;
  idType: string;
  idNumber: string;
  address: string;
  dateOfBirth: string;
}

export interface TransactionFormData {
  transactionType: TransactionType;
  items: TransactionItem[];
  amount: string; // overall total
  notes: string;
}

export interface CustomerMatch {
  customer: Customer;
  matchType: 'exact_id' | 'partial';
  confidence: number;
}

// --- Action Result Types ---

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Philippine ID Types ---

export const PHILIPPINE_ID_TYPES = [
  'Philippine National ID (PhilSys)',
  'Driver\'s License (LTO)',
  'SSS ID / UMID',
  'PhilHealth ID',
  'Passport',
  'PRC ID',
  'Postal ID',
  'Voter\'s ID (COMELEC)',
  'TIN ID (BIR)',
  'Senior Citizen ID',
  'PWD ID',
  'Barangay ID',
  'Company ID',
  'School ID',
  'Other Government ID',
] as const;

export type PhilippineIdType = typeof PHILIPPINE_ID_TYPES[number];
